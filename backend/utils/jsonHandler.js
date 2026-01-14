// utils/jsonHandler.js
/**
 * JSON HANDLER - COMPLETE PRODUCTION VERSION
 * JSON parsing, validation, and sanitization utilities
 * 
 * @module utils/jsonHandler
 */

const { ValidationError } = require('./AppError');

// ============================================================================
// JSON PARSING
// ============================================================================

/**
 * Safe JSON parse with error handling
 * @param {String} jsonString - JSON string
 * @param {*} defaultValue - Default value on error
 * @returns {*} Parsed object or default value
 */
const safeParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON parse error:', error.message);
    return defaultValue;
  }
};

/**
 * Parse JSON with validation
 * @param {String} jsonString - JSON string
 * @param {Function} validator - Validation function
 * @returns {*} Parsed and validated object
 */
const parseAndValidate = (jsonString, validator) => {
  const parsed = JSON.parse(jsonString);
  
  if (validator && !validator(parsed)) {
    throw new ValidationError('JSON validation failed');
  }
  
  return parsed;
};

/**
 * Parse JSON with schema validation
 * @param {String} jsonString - JSON string
 * @param {Object} schema - JSON schema
 * @returns {*} Parsed object
 */
const parseWithSchema = (jsonString, schema) => {
  const parsed = JSON.parse(jsonString);
  const errors = validateSchema(parsed, schema);
  
  if (errors.length > 0) {
    throw new ValidationError('Schema validation failed', errors);
  }
  
  return parsed;
};

// ============================================================================
// JSON STRINGIFICATION
// ============================================================================

/**
 * Safe JSON stringify with error handling
 * @param {*} obj - Object to stringify
 * @param {String} defaultValue - Default value on error
 * @returns {String} JSON string
 */
const safeStringify = (obj, defaultValue = '{}') => {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.warn('JSON stringify error:', error.message);
    return defaultValue;
  }
};

/**
 * Pretty print JSON
 * @param {*} obj - Object to stringify
 * @param {Number} spaces - Number of spaces for indentation
 * @returns {String} Formatted JSON string
 */
const prettyPrint = (obj, spaces = 2) => {
  try {
    return JSON.stringify(obj, null, spaces);
  } catch (error) {
    return safeStringify(obj);
  }
};

/**
 * Stringify with circular reference handling
 * @param {*} obj - Object to stringify
 * @returns {String} JSON string
 */
const stringifyCircular = (obj) => {
  const seen = new WeakSet();
  
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  });
};

/**
 * Stringify with custom replacer
 * @param {*} obj - Object to stringify
 * @param {Array|Function} replacer - Replacer function or array
 * @param {Number} spaces - Indentation spaces
 * @returns {String} JSON string
 */
const stringifyWithReplacer = (obj, replacer, spaces = 0) => {
  return JSON.stringify(obj, replacer, spaces);
};

// ============================================================================
// SCHEMA VALIDATION
// ============================================================================

/**
 * Validate object against schema
 * @param {Object} obj - Object to validate
 * @param {Object} schema - Validation schema
 * @returns {Array} Array of validation errors
 */
const validateSchema = (obj, schema) => {
  const errors = [];
  
  Object.entries(schema).forEach(([key, rules]) => {
    const value = obj[key];
    
    // Required validation
    if (rules.required && (value === undefined || value === null)) {
      errors.push({
        field: key,
        message: `${key} is required`,
        rule: 'required'
      });
      return;
    }
    
    // Skip further validation if not required and empty
    if (!rules.required && (value === undefined || value === null)) {
      return;
    }
    
    // Type validation
    if (rules.type && typeof value !== rules.type) {
      errors.push({
        field: key,
        message: `${key} must be of type ${rules.type}`,
        rule: 'type',
        expected: rules.type,
        actual: typeof value
      });
    }
    
    // String validations
    if (rules.type === 'string' && typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push({
          field: key,
          message: `${key} must be at least ${rules.minLength} characters`,
          rule: 'minLength'
        });
      }
      
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push({
          field: key,
          message: `${key} must be at most ${rules.maxLength} characters`,
          rule: 'maxLength'
        });
      }
      
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push({
          field: key,
          message: `${key} does not match required pattern`,
          rule: 'pattern'
        });
      }
    }
    
    // Number validations
    if (rules.type === 'number' && typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push({
          field: key,
          message: `${key} must be at least ${rules.min}`,
          rule: 'min'
        });
      }
      
      if (rules.max !== undefined && value > rules.max) {
        errors.push({
          field: key,
          message: `${key} must be at most ${rules.max}`,
          rule: 'max'
        });
      }
    }
    
    // Array validations
    if (rules.type === 'array' && Array.isArray(value)) {
      if (rules.minItems && value.length < rules.minItems) {
        errors.push({
          field: key,
          message: `${key} must have at least ${rules.minItems} items`,
          rule: 'minItems'
        });
      }
      
      if (rules.maxItems && value.length > rules.maxItems) {
        errors.push({
          field: key,
          message: `${key} must have at most ${rules.maxItems} items`,
          rule: 'maxItems'
        });
      }
      
      if (rules.itemType) {
        value.forEach((item, index) => {
          if (typeof item !== rules.itemType) {
            errors.push({
              field: `${key}[${index}]`,
              message: `${key}[${index}] must be of type ${rules.itemType}`,
              rule: 'itemType'
            });
          }
        });
      }
    }
    
    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push({
        field: key,
        message: `${key} must be one of: ${rules.enum.join(', ')}`,
        rule: 'enum',
        allowedValues: rules.enum
      });
    }
    
    // Custom validation
    if (rules.validate && typeof rules.validate === 'function') {
      const customError = rules.validate(value);
      if (customError) {
        errors.push({
          field: key,
          message: customError,
          rule: 'custom'
        });
      }
    }
  });
  
  return errors;
};

/**
 * Validate nested object
 * @param {Object} obj - Object to validate
 * @param {Object} schema - Nested schema
 * @returns {Array} Validation errors
 */
const validateNested = (obj, schema) => {
  const errors = [];
  
  Object.entries(schema).forEach(([key, rules]) => {
    if (rules.type === 'object' && rules.properties) {
      const nestedObj = obj[key];
      if (nestedObj && typeof nestedObj === 'object') {
        const nestedErrors = validateSchema(nestedObj, rules.properties);
        nestedErrors.forEach(error => {
          errors.push({
            ...error,
            field: `${key}.${error.field}`
          });
        });
      }
    }
  });
  
  return errors;
};

// ============================================================================
// JSON SANITIZATION
// ============================================================================

/**
 * Sanitize JSON by removing sensitive fields
 * @param {Object} obj - Object to sanitize
 * @param {Array} sensitiveFields - Fields to remove
 * @returns {Object} Sanitized object
 */
const sanitize = (obj, sensitiveFields = ['password', 'token', 'secret']) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  Object.keys(obj).forEach(key => {
    if (sensitiveFields.includes(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitized[key] = sanitize(obj[key], sensitiveFields);
    } else {
      sanitized[key] = obj[key];
    }
  });
  
  return sanitized;
};

/**
 * Deep clone object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }
  
  if (obj instanceof Object) {
    const cloned = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }
};

/**
 * Remove null/undefined values
 * @param {Object} obj - Object to clean
 * @returns {Object} Cleaned object
 */
const removeEmpty = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const cleaned = {};
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    
    if (value === null || value === undefined) {
      return;
    }
    
    if (typeof value === 'object' && !Array.isArray(value)) {
      const cleanedNested = removeEmpty(value);
      if (Object.keys(cleanedNested).length > 0) {
        cleaned[key] = cleanedNested;
      }
    } else {
      cleaned[key] = value;
    }
  });
  
  return cleaned;
};

/**
 * Flatten nested object
 * @param {Object} obj - Object to flatten
 * @param {String} prefix - Key prefix
 * @returns {Object} Flattened object
 */
const flatten = (obj, prefix = '') => {
  const flattened = {};
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(flattened, flatten(value, newKey));
    } else {
      flattened[newKey] = value;
    }
  });
  
  return flattened;
};

/**
 * Unflatten object
 * @param {Object} obj - Flattened object
 * @returns {Object} Nested object
 */
const unflatten = (obj) => {
  const result = {};
  
  Object.keys(obj).forEach(key => {
    const keys = key.split('.');
    let current = result;
    
    keys.forEach((k, index) => {
      if (index === keys.length - 1) {
        current[k] = obj[key];
      } else {
        current[k] = current[k] || {};
        current = current[k];
      }
    });
  });
  
  return result;
};

// ============================================================================
// JSON TRANSFORMATION
// ============================================================================

/**
 * Pick specific fields from object
 * @param {Object} obj - Source object
 * @param {Array} fields - Fields to pick
 * @returns {Object} Object with picked fields
 */
const pick = (obj, fields) => {
  const picked = {};
  
  fields.forEach(field => {
    if (obj.hasOwnProperty(field)) {
      picked[field] = obj[field];
    }
  });
  
  return picked;
};

/**
 * Omit specific fields from object
 * @param {Object} obj - Source object
 * @param {Array} fields - Fields to omit
 * @returns {Object} Object without omitted fields
 */
const omit = (obj, fields) => {
  const omitted = { ...obj };
  
  fields.forEach(field => {
    delete omitted[field];
  });
  
  return omitted;
};

/**
 * Rename object keys
 * @param {Object} obj - Source object
 * @param {Object} mapping - Key mapping (oldKey: newKey)
 * @returns {Object} Object with renamed keys
 */
const renameKeys = (obj, mapping) => {
  const renamed = {};
  
  Object.keys(obj).forEach(key => {
    const newKey = mapping[key] || key;
    renamed[newKey] = obj[key];
  });
  
  return renamed;
};

/**
 * Transform object values
 * @param {Object} obj - Source object
 * @param {Function} transformer - Transform function
 * @returns {Object} Transformed object
 */
const mapValues = (obj, transformer) => {
  const mapped = {};
  
  Object.keys(obj).forEach(key => {
    mapped[key] = transformer(obj[key], key);
  });
  
  return mapped;
};

// ============================================================================
// JSON COMPARISON
// ============================================================================

/**
 * Deep compare two objects
 * @param {*} obj1 - First object
 * @param {*} obj2 - Second object
 * @returns {Boolean} True if equal
 */
const deepEqual = (obj1, obj2) => {
  if (obj1 === obj2) return true;
  
  if (obj1 == null || obj2 == null) return false;
  
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return obj1 === obj2;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  return keys1.every(key => deepEqual(obj1[key], obj2[key]));
};

/**
 * Get differences between two objects
 * @param {Object} obj1 - First object
 * @param {Object} obj2 - Second object
 * @returns {Object} Differences
 */
const diff = (obj1, obj2) => {
  const differences = {};
  
  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
  
  allKeys.forEach(key => {
    if (!deepEqual(obj1[key], obj2[key])) {
      differences[key] = {
        old: obj1[key],
        new: obj2[key]
      };
    }
  });
  
  return differences;
};

/**
 * Merge objects deeply
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
const deepMerge = (target, source) => {
  const result = { ...target };
  
  Object.keys(source).forEach(key => {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  });
  
  return result;
};

// ============================================================================
// JSON UTILITIES
// ============================================================================

/**
 * Get nested value from object
 * @param {Object} obj - Source object
 * @param {String} path - Dot-notation path
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Value at path
 */
const get = (obj, path, defaultValue = undefined) => {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return defaultValue;
    }
  }
  
  return current;
};

/**
 * Set nested value in object
 * @param {Object} obj - Target object
 * @param {String} path - Dot-notation path
 * @param {*} value - Value to set
 * @returns {Object} Modified object
 */
const set = (obj, path, value) => {
  const keys = path.split('.');
  const lastKey = keys.pop();
  let current = obj;
  
  keys.forEach(key => {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  });
  
  current[lastKey] = value;
  return obj;
};

/**
 * Check if object has nested path
 * @param {Object} obj - Source object
 * @param {String} path - Dot-notation path
 * @returns {Boolean} True if path exists
 */
const has = (obj, path) => {
  return get(obj, path, Symbol('notFound')) !== Symbol('notFound');
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Parsing
  safeParse,
  parseAndValidate,
  parseWithSchema,
  
  // Stringification
  safeStringify,
  prettyPrint,
  stringifyCircular,
  stringifyWithReplacer,
  
  // Validation
  validateSchema,
  validateNested,
  
  // Sanitization
  sanitize,
  deepClone,
  removeEmpty,
  flatten,
  unflatten,
  
  // Transformation
  pick,
  omit,
  renameKeys,
  mapValues,
  
  // Comparison
  deepEqual,
  diff,
  deepMerge,
  
  // Utilities
  get,
  set,
  has
};