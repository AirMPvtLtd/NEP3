/**
 * middleware/apiKey.middleware.js
 *
 * External API key authentication — for researchers and B2B consumers
 * who call the /api/research/* endpoints without a browser session.
 *
 * Key lookup: X-Api-Key header  OR  ?api_key= query param
 * Key model : ResearchAPIKey (rsk_ prefix, 64-char hex)
 */

'use strict';

const { ResearchAPIKey } = require('../models');
const logger = require('../utils/logger');

/**
 * Authenticate request by API key.
 * Attaches req.apiKeyDoc on success.
 */
async function authenticateApiKey(req, res, next) {
  const key =
    req.headers['x-api-key'] ||
    req.headers['X-Api-Key'] ||
    req.query.api_key;

  if (!key) {
    return res.status(401).json({
      success: false,
      code: 'API_KEY_REQUIRED',
      message: 'API key required. Provide via X-Api-Key header or api_key query param.',
      docs: '/api-docs#section/Authentication/ApiKeyAuth',
    });
  }

  try {
    const apiKeyDoc = await ResearchAPIKey.findOne({ key });

    if (!apiKeyDoc) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_API_KEY',
        message: 'Invalid API key.',
      });
    }

    if (!apiKeyDoc.active) {
      return res.status(401).json({
        success: false,
        code: 'API_KEY_REVOKED',
        message: 'This API key has been revoked.',
        revokedAt: apiKeyDoc.revokedAt,
      });
    }

    if (apiKeyDoc.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        code: 'API_KEY_EXPIRED',
        message: 'This API key has expired. Please request a new key.',
        expiredAt: apiKeyDoc.expiresAt,
      });
    }

    req.apiKeyDoc = apiKeyDoc;

    // Record usage asynchronously — never block the request
    apiKeyDoc.recordUsage().catch(err =>
      logger.error('[apiKey] Failed to record usage:', err.message)
    );

    next();
  } catch (err) {
    logger.error('[apiKey] Authentication error:', err);
    return res.status(500).json({ success: false, message: 'Authentication error' });
  }
}

/**
 * requirePermission(permissionName)
 * Checks that the authenticated API key has a specific permission flag.
 * Must be used AFTER authenticateApiKey.
 *
 * @param {'canExportCognitionData'|'canViewRawData'|'canExportFullDataset'} perm
 */
function requirePermission(perm) {
  return (req, res, next) => {
    if (!req.apiKeyDoc) {
      return res.status(401).json({
        success: false,
        message: 'API key authentication required before checking permissions.',
      });
    }

    if (!req.apiKeyDoc.permissions || !req.apiKeyDoc.permissions[perm]) {
      return res.status(403).json({
        success: false,
        code: 'PERMISSION_DENIED',
        message: `Your API key does not have the "${perm}" permission. Contact support to upgrade.`,
      });
    }

    next();
  };
}

module.exports = { authenticateApiKey, requirePermission };
