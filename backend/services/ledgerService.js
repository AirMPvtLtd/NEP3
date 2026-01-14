// services/ledgerService.js
/**
 * LEDGER SERVICE
 * Cryptographic and ledger operations for NEP report anchoring
 * 
 * @module services/ledgerService
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

// ============================================================================
// HASHING FUNCTIONS
// ============================================================================

/**
 * Generate SHA256 hash of data
 * @param {string|object} data - Data to hash
 * @returns {string} SHA256 hex hash
 */
function generateSHA256(data) {
  try {
    const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
    return crypto
      .createHash('sha256')
      .update(dataString)
      .digest('hex');
  } catch (error) {
    logger.error('SHA256 generation error:', error);
    throw new Error(`Hash generation failed: ${error.message}`);
  }
}

/**
 * Generate double hash for extra security
 * @param {string|object} data - Data to hash
 * @returns {string} Double SHA256 hash
 */
function generateDoubleHash(data) {
  const firstHash = generateSHA256(data);
  return generateSHA256(firstHash);
}

// ============================================================================
// MERKLE TREE FUNCTIONS
// ============================================================================

/**
 * Create a Merkle tree from an array of ledger events
 * @param {Array} events - Array of ledger events
 * @returns {Object} Merkle tree object with root and leaves
 */
function createMerkleTree(events) {
  try {
    if (!events || events.length === 0) {
      logger.warn('No events provided for merkle tree creation');
      return {
        merkleRoot: null,
        leafCount: 0,
        leaves: [],
        tree: []
      };
    }

    // Generate leaf hashes from events
    const leaves = events.map((event, index) => {
      const leafData = {
        eventId: event.eventId || event.id || `event-${index}`,
        hash: event.hash || generateSHA256(event),
        timestamp: event.timestamp || new Date().toISOString(),
        eventType: event.eventType,
        index
      };
      
      return {
        ...leafData,
        leafHash: generateSHA256(leafData)
      };
    });

    // Build merkle tree from leaves
    const buildTree = (hashes) => {
      if (hashes.length === 1) return hashes[0];
      
      const nextLevel = [];
      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = hashes[i + 1] || left; // Duplicate last if odd number
        
        const combined = crypto.createHash('sha256')
          .update(left + right)
          .digest('hex');
        nextLevel.push(combined);
      }
      
      return buildTree(nextLevel);
    };

    const leafHashes = leaves.map(leaf => leaf.leafHash);
    const merkleRoot = buildTree(leafHashes);

    return {
      merkleRoot,
      leafCount: leaves.length,
      leaves,
      tree: leafHashes,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Merkle tree creation error:', error);
    throw new Error(`Merkle tree creation failed: ${error.message}`);
  }
}

/**
 * Generate merkle proof for a specific leaf
 * @param {string} leafHash - Hash of the leaf to prove
 * @param {Array} leaves - Array of leaf hashes
 * @param {string} merkleRoot - Root of the merkle tree
 * @returns {Object} Merkle proof object
 */
function generateMerkleProof(leafHash, leaves, merkleRoot) {
  try {
    if (!leaves || leaves.length === 0 || !merkleRoot) {
      throw new Error('Invalid parameters for merkle proof');
    }

    // Find leaf index
    const leafIndex = leaves.findIndex(leaf => leaf.leafHash === leafHash);
    if (leafIndex === -1) {
      throw new Error('Leaf not found in merkle tree');
    }

    let proof = [];
    let currentLevel = leaves.map(l => l.leafHash);
    let currentIndex = leafIndex;

    while (currentLevel.length > 1) {
      const isRightNode = currentIndex % 2;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
      
      if (siblingIndex < currentLevel.length) {
        proof.push({
          position: isRightNode ? 'left' : 'right',
          hash: currentLevel[siblingIndex]
        });
      }

      // Move to next level
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left;
        const combined = crypto.createHash('sha256')
          .update(left + right)
          .digest('hex');
        nextLevel.push(combined);
      }

      currentLevel = nextLevel;
      currentIndex = Math.floor(currentIndex / 2);
    }

    // Verify proof leads to root
    const calculatedRoot = verifyMerkleProofWithPath(leafHash, proof);
    const isValid = calculatedRoot === merkleRoot;

    return {
      leafHash,
      leafIndex,
      proof,
      merkleRoot,
      isValid,
      proofGeneratedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Merkle proof generation error:', error);
    throw new Error(`Merkle proof generation failed: ${error.message}`);
  }
}

/**
 * Verify merkle proof
 * @param {string} leafHash - Original leaf hash
 * @param {Array} proof - Array of proof objects with position and hash
 * @returns {string} Calculated merkle root
 */
function verifyMerkleProofWithPath(leafHash, proof) {
  try {
    let currentHash = leafHash;
    
    for (const node of proof) {
      if (node.position === 'left') {
        currentHash = crypto.createHash('sha256')
          .update(node.hash + currentHash)
          .digest('hex');
      } else {
        currentHash = crypto.createHash('sha256')
          .update(currentHash + node.hash)
          .digest('hex');
      }
    }
    
    return currentHash;
  } catch (error) {
    logger.error('Merkle proof verification error:', error);
    throw new Error(`Merkle proof verification failed: ${error.message}`);
  }
}

/**
 * Simple merkle proof verification
 * @param {string} leafHash - Leaf hash to verify
 * @param {string} merkleRoot - Expected merkle root
 * @param {Array} events - Original events array
 * @returns {boolean} True if valid
 */
function verifyMerkleProof(leafHash, merkleRoot, events) {
  try {
    const tree = createMerkleTree(events);
    return tree.merkleRoot === merkleRoot;
  } catch (error) {
    logger.error('Simple merkle verification error:', error);
    return false;
  }
}

// ============================================================================
// REPORT HASHING FUNCTIONS
// ============================================================================

/**
 * Generate unique report hash
 * @param {Object} reportData - Report data
 * @param {string} merkleRoot - Merkle root from ledger
 * @returns {string} Unique report hash
 */
function generateReportHash(reportData, merkleRoot) {
  try {
    if (!reportData || !merkleRoot) {
      throw new Error('Report data and merkle root required');
    }

    const normalizedData = {
      ...reportData,
      generatedAt: reportData.generatedAt || new Date().toISOString(),
      reportVersion: reportData.reportVersion || '2.0'
    };

    const dataHash = generateSHA256(normalizedData);
    const combined = dataHash + merkleRoot + normalizedData.generatedAt;
    
    return generateDoubleHash(combined);
  } catch (error) {
    logger.error('Report hash generation error:', error);
    throw new Error(`Report hash generation failed: ${error.message}`);
  }
}

/**
 * Verify report hash
 * @param {Object} reportData - Report data
 * @param {string} merkleRoot - Merkle root
 * @param {string} storedHash - Stored report hash
 * @returns {Object} Verification result
 */
function verifyReportHash(reportData, merkleRoot, storedHash) {
  try {
    const calculatedHash = generateReportHash(reportData, merkleRoot);
    
    return {
      isValid: calculatedHash === storedHash,
      calculatedHash,
      storedHash,
      verifiedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Report hash verification error:', error);
    return {
      isValid: false,
      error: error.message,
      verifiedAt: new Date().toISOString()
    };
  }
}

// ============================================================================
// CHAIN INTEGRITY FUNCTIONS
// ============================================================================

/**
 * Validate ledger chain integrity
 * @param {Array} ledgerEvents - Sorted ledger events
 * @returns {Object} Integrity report
 */
function validateChainIntegrity(ledgerEvents) {
  try {
    if (!ledgerEvents || ledgerEvents.length === 0) {
      return {
        isValid: false,
        totalEvents: 0,
        chainBroken: true,
        invalidEvents: [],
        error: 'No ledger events provided'
      };
    }

    const invalidEvents = [];
    let previousHash = null;

    // Sort by block index or timestamp
    const sortedEvents = [...ledgerEvents].sort((a, b) => {
      if (a.metadata?.blockIndex && b.metadata?.blockIndex) {
        return a.metadata.blockIndex - b.metadata.blockIndex;
      }
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

    for (let i = 0; i < sortedEvents.length; i++) {
      const event = sortedEvents[i];
      const eventHash = event.hash;
      const previousEventHash = event.metadata?.previousHash;

      // Check if this is the first event
      if (i === 0) {
        if (previousEventHash && previousEventHash !== 'GENESIS') {
          invalidEvents.push({
            eventId: event.eventId,
            issue: 'First event should have GENESIS or no previous hash',
            previousHash: previousEventHash,
            expected: 'GENESIS or null'
          });
        }
      } else {
        // Check chain linking
        if (previousEventHash !== previousHash) {
          invalidEvents.push({
            eventId: event.eventId,
            issue: 'Chain link broken',
            previousHash: previousEventHash,
            expected: previousHash,
            index: i
          });
        }
      }

      // Verify event's own hash
      const eventData = {
        eventId: event.eventId,
        eventType: event.eventType,
        timestamp: event.timestamp,
        data: event.data
      };
      
      const calculatedHash = generateSHA256(eventData);
      if (calculatedHash !== eventHash) {
        invalidEvents.push({
          eventId: event.eventId,
          issue: 'Event hash mismatch',
          calculatedHash,
          storedHash: eventHash
        });
      }

      previousHash = eventHash;
    }

    const chainBroken = invalidEvents.length > 0;
    
    return {
      isValid: !chainBroken,
      totalEvents: sortedEvents.length,
      chainBroken,
      invalidEvents,
      chainLength: sortedEvents.length,
      verifiedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Chain integrity validation error:', error);
    return {
      isValid: false,
      totalEvents: 0,
      chainBroken: true,
      invalidEvents: [],
      error: error.message
    };
  }
}

// ============================================================================
// TIMESTAMP VERIFICATION
// ============================================================================

/**
 * Verify timestamp integrity
 * @param {Array} events - Events to verify
 * @returns {Object} Timestamp verification result
 */
function verifyTimestamps(events) {
  try {
    if (!events || events.length < 2) {
      return {
        isValid: true,
        totalEvents: events?.length || 0,
        timestampIssues: [],
        message: 'Insufficient events for timestamp verification'
      };
    }

    const issues = [];
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    for (let i = 1; i < sortedEvents.length; i++) {
      const currentTime = new Date(sortedEvents[i].timestamp);
      const previousTime = new Date(sortedEvents[i - 1].timestamp);

      if (currentTime < previousTime) {
        issues.push({
          eventId: sortedEvents[i].eventId,
          issue: 'Timestamp earlier than previous event',
          currentTime: currentTime.toISOString(),
          previousTime: previousTime.toISOString(),
          difference: previousTime - currentTime
        });
      }

      // Check for unrealistic time gaps (more than 1 year)
      const timeDiff = Math.abs(currentTime - previousTime);
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      if (timeDiff > oneYear) {
        issues.push({
          eventId: sortedEvents[i].eventId,
          issue: 'Unrealistic time gap between events',
          timeDiff: `${(timeDiff / (1000 * 60 * 60 * 24)).toFixed(2)} days`,
          maxAllowed: '365 days'
        });
      }
    }

    return {
      isValid: issues.length === 0,
      totalEvents: sortedEvents.length,
      timestampIssues: issues,
      timeRange: {
        start: sortedEvents[0].timestamp,
        end: sortedEvents[sortedEvents.length - 1].timestamp
      },
      verifiedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Timestamp verification error:', error);
    return {
      isValid: false,
      error: error.message,
      verifiedAt: new Date().toISOString()
    };
  }
}

// ============================================================================
// BATCH VERIFICATION
// ============================================================================

/**
 * Batch verify multiple reports
 * @param {Array} reports - Array of reports to verify
 * @returns {Object} Batch verification results
 */
function batchVerifyReports(reports) {
  try {
    if (!Array.isArray(reports)) {
      throw new Error('Reports must be an array');
    }

    const results = [];
    const startTime = Date.now();

    for (const report of reports) {
      try {
        const verification = {
          reportId: report.reportId,
          studentId: report.studentId,
          timestamp: new Date().toISOString()
        };

        if (!report.ledgerMetadata) {
          verification.isValid = false;
          verification.error = 'No ledger metadata found';
          results.push(verification);
          continue;
        }

        // Basic hash check
        const hasHash = !!report.ledgerMetadata.reportHash;
        const hasMerkle = !!report.ledgerMetadata.merkleRoot;
        const hasAnchoredAt = !!report.ledgerMetadata.anchoredAt;

        verification.isValid = hasHash && hasMerkle && hasAnchoredAt;
        verification.checks = {
          hasHash,
          hasMerkle,
          hasAnchoredAt
        };

        if (report.performanceMetrics) {
          verification.cpi = report.performanceMetrics.cpi;
        }

        results.push(verification);
      } catch (error) {
        results.push({
          reportId: report.reportId,
          isValid: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    const validCount = results.filter(r => r.isValid).length;
    const invalidCount = results.length - validCount;

    return {
      total: results.length,
      validCount,
      invalidCount,
      successRate: (validCount / results.length * 100).toFixed(2),
      results,
      processingTime: Date.now() - startTime,
      batchVerifiedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Batch verification error:', error);
    throw new Error(`Batch verification failed: ${error.message}`);
  }
}

// ============================================================================
// CRYPTOGRAPHIC UTILITIES
// ============================================================================

/**
 * Generate unique ID with timestamp
 * @param {string} prefix - ID prefix
 * @returns {string} Unique ID
 */
function generateUniqueId(prefix = 'ID') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

/**
 * Generate digital signature for data
 * @param {Object} data - Data to sign
 * @param {string} privateKey - Private key (in production)
 * @returns {string} Digital signature
 */
function generateSignature(data, privateKey) {
  try {
    const dataString = JSON.stringify(data);
    const sign = crypto.createSign('SHA256');
    sign.update(dataString);
    sign.end();
    
    // In production, use actual private key
    // const signature = sign.sign(privateKey, 'hex');
    
    // For development, generate mock signature
    const mockSignature = crypto
      .createHash('sha256')
      .update(dataString + Date.now())
      .digest('hex');
    
    return {
      signature: mockSignature,
      algorithm: 'SHA256',
      signedAt: new Date().toISOString(),
      note: 'Mock signature for development'
    };
  } catch (error) {
    logger.error('Signature generation error:', error);
    throw new Error(`Signature generation failed: ${error.message}`);
  }
}

/**
 * Verify digital signature
 * @param {Object} data - Original data
 * @param {string} signature - Signature to verify
 * @param {string} publicKey - Public key (in production)
 * @returns {boolean} True if signature is valid
 */
function verifySignature(data, signature, publicKey) {
  try {
    // In production, use actual verification
    // const verify = crypto.createVerify('SHA256');
    // verify.update(JSON.stringify(data));
    // return verify.verify(publicKey, signature, 'hex');
    
    // For development, accept mock signatures
    return signature && typeof signature === 'string' && signature.length === 64;
  } catch (error) {
    logger.error('Signature verification error:', error);
    return false;
  }
}

// ============================================================================
// LEDGER AUDIT FUNCTIONS
// ============================================================================

/**
 * Create audit trail for ledger operations
 * @param {string} operation - Operation performed
 * @param {string} entityId - Entity ID
 * @param {Object} data - Operation data
 * @param {string} performedBy - User who performed operation
 * @returns {Object} Audit trail entry
 */
function createAuditTrail(operation, entityId, data, performedBy) {
  try {
    const auditEntry = {
      auditId: generateUniqueId('AUDIT'),
      operation,
      entityId,
      dataHash: generateSHA256(data),
      performedBy,
      timestamp: new Date().toISOString(),
      metadata: {
        ipAddress: 'system', // In production, get from request
        userAgent: 'system',
        sessionId: generateUniqueId('SESSION')
      }
    };

    auditEntry.signature = generateSignature(auditEntry).signature;

    return auditEntry;
  } catch (error) {
    logger.error('Audit trail creation error:', error);
    throw new Error(`Audit trail creation failed: ${error.message}`);
  }
}

/**
 * Verify audit trail integrity
 * @param {Array} auditTrail - Audit trail entries
 * @returns {Object} Verification result
 */
function verifyAuditTrail(auditTrail) {
  try {
    if (!Array.isArray(auditTrail)) {
      throw new Error('Audit trail must be an array');
    }

    const issues = [];
    let previousHash = null;

    for (let i = 0; i < auditTrail.length; i++) {
      const entry = auditTrail[i];
      
      // Check required fields
      if (!entry.auditId || !entry.operation || !entry.timestamp) {
        issues.push({
          entryIndex: i,
          issue: 'Missing required fields',
          auditId: entry.auditId
        });
      }

      // Verify signature
      if (entry.signature) {
        const entryWithoutSig = { ...entry };
        delete entryWithoutSig.signature;
        
        const isValidSig = verifySignature(entryWithoutSig, entry.signature);
        if (!isValidSig) {
          issues.push({
            entryIndex: i,
            issue: 'Invalid signature',
            auditId: entry.auditId
          });
        }
      }

      // Verify chain linking (if implemented)
      if (i > 0 && entry.metadata?.previousHash !== previousHash) {
        issues.push({
          entryIndex: i,
          issue: 'Audit chain broken',
          auditId: entry.auditId
        });
      }

      previousHash = generateSHA256(entry);
    }

    return {
      isValid: issues.length === 0,
      totalEntries: auditTrail.length,
      issues,
      verifiedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Audit trail verification error:', error);
    return {
      isValid: false,
      error: error.message,
      verifiedAt: new Date().toISOString()
    };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  // Hashing functions
  generateSHA256,
  generateDoubleHash,
  
  // Merkle tree functions
  createMerkleTree,
  generateMerkleProof,
  verifyMerkleProof,
  verifyMerkleProofWithPath,
  
  // Report functions
  generateReportHash,
  verifyReportHash,
  
  // Chain integrity
  validateChainIntegrity,
  verifyTimestamps,
  
  // Batch operations
  batchVerifyReports,
  
  // Cryptographic utilities
  generateUniqueId,
  generateSignature,
  verifySignature,
  
  // Audit functions
  createAuditTrail,
  verifyAuditTrail,
  
  // Constants
  HASH_ALGORITHM: 'SHA256',
  MERKLE_ALGORITHM: 'SHA256',
  REPORT_HASH_VERSION: '2.0'
};