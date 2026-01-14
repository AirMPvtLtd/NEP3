// utils/AppError.js
/**
 * APP ERROR - COMPLETE PRODUCTION VERSION
 * Custom error classes for consistent error handling
 * 
 * @module utils/AppError
 */

// ============================================================================
// BASE ERROR CLASS
// ============================================================================

/**
 * Base application error class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

/**
 * Validation error - 400
 */
class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 400);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Invalid input error - 400
 */
class InvalidInputError extends AppError {
  constructor(field, message = 'Invalid input') {
    super(`${message}: ${field}`, 400);
    this.name = 'InvalidInputError';
    this.field = field;
  }
}

/**
 * Missing required field error - 400
 */
class MissingFieldError extends AppError {
  constructor(field) {
    super(`Required field missing: ${field}`, 400);
    this.name = 'MissingFieldError';
    this.field = field;
  }
}

// ============================================================================
// AUTHENTICATION ERRORS
// ============================================================================

/**
 * Authentication error - 401
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Invalid credentials error - 401
 */
class InvalidCredentialsError extends AppError {
  constructor(message = 'Invalid email or password') {
    super(message, 401);
    this.name = 'InvalidCredentialsError';
  }
}

/**
 * Token expired error - 401
 */
class TokenExpiredError extends AppError {
  constructor(message = 'Token has expired') {
    super(message, 401);
    this.name = 'TokenExpiredError';
  }
}

/**
 * Invalid token error - 401
 */
class InvalidTokenError extends AppError {
  constructor(message = 'Invalid token') {
    super(message, 401);
    this.name = 'InvalidTokenError';
  }
}

/**
 * Account not verified error - 401
 */
class AccountNotVerifiedError extends AppError {
  constructor(message = 'Please verify your email address') {
    super(message, 401);
    this.name = 'AccountNotVerifiedError';
  }
}

// ============================================================================
// AUTHORIZATION ERRORS
// ============================================================================

/**
 * Authorization error - 403
 */
class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Forbidden error - 403
 */
class ForbiddenError extends AppError {
  constructor(resource = 'this resource') {
    super(`You do not have permission to access ${resource}`, 403);
    this.name = 'ForbiddenError';
    this.resource = resource;
  }
}

/**
 * Insufficient permissions error - 403
 */
class InsufficientPermissionsError extends AppError {
  constructor(requiredRole) {
    super(`Insufficient permissions. Required role: ${requiredRole}`, 403);
    this.name = 'InsufficientPermissionsError';
    this.requiredRole = requiredRole;
  }
}

/**
 * Account suspended error - 403
 */
class AccountSuspendedError extends AppError {
  constructor(message = 'Your account has been suspended') {
    super(message, 403);
    this.name = 'AccountSuspendedError';
  }
}

// ============================================================================
// NOT FOUND ERRORS
// ============================================================================

/**
 * Not found error - 404
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource', id = null) {
    const message = id 
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;
    super(message, 404);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.id = id;
  }
}

/**
 * Route not found error - 404
 */
class RouteNotFoundError extends AppError {
  constructor(path) {
    super(`Route '${path}' not found`, 404);
    this.name = 'RouteNotFoundError';
    this.path = path;
  }
}

// ============================================================================
// CONFLICT ERRORS
// ============================================================================

/**
 * Conflict error - 409
 */
class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Duplicate error - 409
 */
class DuplicateError extends AppError {
  constructor(field, value) {
    super(`${field} '${value}' already exists`, 409);
    this.name = 'DuplicateError';
    this.field = field;
    this.value = value;
  }
}

/**
 * Already exists error - 409
 */
class AlreadyExistsError extends AppError {
  constructor(resource) {
    super(`${resource} already exists`, 409);
    this.name = 'AlreadyExistsError';
    this.resource = resource;
  }
}

// ============================================================================
// RATE LIMIT ERRORS
// ============================================================================

/**
 * Rate limit error - 429
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please try again later', retryAfter = 60) {
    super(message, 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Too many attempts error - 429
 */
class TooManyAttemptsError extends AppError {
  constructor(action, retryAfter = 900) {
    super(`Too many ${action} attempts. Please try again later.`, 429);
    this.name = 'TooManyAttemptsError';
    this.action = action;
    this.retryAfter = retryAfter;
  }
}

// ============================================================================
// SERVER ERRORS
// ============================================================================

/**
 * Internal server error - 500
 */
class InternalServerError extends AppError {
  constructor(message = 'Internal server error', isOperational = false) {
    super(message, 500, isOperational);
    this.name = 'InternalServerError';
  }
}

/**
 * Database error - 500
 */
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message, 500, false);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

/**
 * External service error - 502
 */
class ExternalServiceError extends AppError {
  constructor(service, message = 'External service error') {
    super(`${service}: ${message}`, 502);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

/**
 * Service unavailable error - 503
 */
class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503);
    this.name = 'ServiceUnavailableError';
  }
}

// ============================================================================
// BUSINESS LOGIC ERRORS
// ============================================================================

/**
 * Business logic error - 422
 */
class BusinessLogicError extends AppError {
  constructor(message) {
    super(message, 422);
    this.name = 'BusinessLogicError';
  }
}

/**
 * Invalid state error - 422
 */
class InvalidStateError extends AppError {
  constructor(resource, currentState, requiredState) {
    super(
      `${resource} is in '${currentState}' state. Required: '${requiredState}'`,
      422
    );
    this.name = 'InvalidStateError';
    this.resource = resource;
    this.currentState = currentState;
    this.requiredState = requiredState;
  }
}

/**
 * Operation not allowed error - 422
 */
class OperationNotAllowedError extends AppError {
  constructor(operation, reason) {
    super(`Operation '${operation}' not allowed: ${reason}`, 422);
    this.name = 'OperationNotAllowedError';
    this.operation = operation;
    this.reason = reason;
  }
}

// ============================================================================
// FILE ERRORS
// ============================================================================

/**
 * File error - 400
 */
class FileError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'FileError';
  }
}

/**
 * File too large error - 413
 */
class FileTooLargeError extends AppError {
  constructor(maxSize) {
    super(`File size exceeds maximum allowed size of ${maxSize}`, 413);
    this.name = 'FileTooLargeError';
    this.maxSize = maxSize;
  }
}

/**
 * Invalid file type error - 400
 */
class InvalidFileTypeError extends AppError {
  constructor(fileType, allowedTypes) {
    super(
      `Invalid file type '${fileType}'. Allowed: ${allowedTypes.join(', ')}`,
      400
    );
    this.name = 'InvalidFileTypeError';
    this.fileType = fileType;
    this.allowedTypes = allowedTypes;
  }
}

// ============================================================================
// PAYMENT ERRORS
// ============================================================================

/**
 * Payment error - 402
 */
class PaymentError extends AppError {
  constructor(message = 'Payment required') {
    super(message, 402);
    this.name = 'PaymentError';
  }
}

/**
 * Insufficient credits error - 402
 */
class InsufficientCreditsError extends AppError {
  constructor(required, available) {
    super(
      `Insufficient credits. Required: ${required}, Available: ${available}`,
      402
    );
    this.name = 'InsufficientCreditsError';
    this.required = required;
    this.available = available;
  }
}

// ============================================================================
// NETWORK ERRORS
// ============================================================================

/**
 * Network error - 500
 */
class NetworkError extends AppError {
  constructor(message = 'Network error occurred', isOperational = false) {
    super(message, 500, isOperational);
    this.name = 'NetworkError';
  }
}

/**
 * Timeout error - 408
 */
class TimeoutError extends AppError {
  constructor(operation, timeout) {
    super(`Operation '${operation}' timed out after ${timeout}ms`, 408);
    this.name = 'TimeoutError';
    this.operation = operation;
    this.timeout = timeout;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if error is operational
 * @param {Error} error - Error object
 * @returns {Boolean}
 */
const isOperationalError = (error) => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

/**
 * Create error response object
 * @param {Error} error - Error object
 * @param {Boolean} includeStack - Include stack trace
 * @returns {Object}
 */
const createErrorResponse = (error, includeStack = false) => {
  const response = {
    status: error.status || 'error',
    message: error.message,
    timestamp: error.timestamp || new Date().toISOString()
  };
  
  // Add additional properties if they exist
  if (error.errors) response.errors = error.errors;
  if (error.field) response.field = error.field;
  if (error.resource) response.resource = error.resource;
  if (error.id) response.id = error.id;
  if (error.retryAfter) response.retryAfter = error.retryAfter;
  
  // Add stack trace in development
  if (includeStack && error.stack) {
    response.stack = error.stack;
  }
  
  return response;
};

/**
 * Log error with context
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
const logError = (error, context = {}) => {
  const errorLog = {
    name: error.name || 'Error',
    message: error.message,
    statusCode: error.statusCode || 500,
    timestamp: new Date().toISOString(),
    ...context
  };
  
  if (error.stack) {
    errorLog.stack = error.stack;
  }
  
  console.error('Error:', JSON.stringify(errorLog, null, 2));
};

// ============================================================================
// ERROR FACTORY
// ============================================================================

/**
 * Error factory for creating appropriate errors
 */
class ErrorFactory {
  static validation(message, errors) {
    return new ValidationError(message, errors);
  }
  
  static authentication(message) {
    return new AuthenticationError(message);
  }
  
  static authorization(message) {
    return new AuthorizationError(message);
  }
  
  static notFound(resource, id) {
    return new NotFoundError(resource, id);
  }
  
  static conflict(message) {
    return new ConflictError(message);
  }
  
  static duplicate(field, value) {
    return new DuplicateError(field, value);
  }
  
  static rateLimit(message, retryAfter) {
    return new RateLimitError(message, retryAfter);
  }
  
  static internal(message, isOperational) {
    return new InternalServerError(message, isOperational);
  }
  
  static database(message, originalError) {
    return new DatabaseError(message, originalError);
  }
  
  static externalService(service, message) {
    return new ExternalServiceError(service, message);
  }
  
  static businessLogic(message) {
    return new BusinessLogicError(message);
  }
  
  static invalidState(resource, currentState, requiredState) {
    return new InvalidStateError(resource, currentState, requiredState);
  }
  
  static file(message) {
    return new FileError(message);
  }
  
  static fileTooLarge(maxSize) {
    return new FileTooLargeError(maxSize);
  }
  
  static invalidFileType(fileType, allowedTypes) {
    return new InvalidFileTypeError(fileType, allowedTypes);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Base
  AppError,
  
  // Validation
  ValidationError,
  InvalidInputError,
  MissingFieldError,
  
  // Authentication
  AuthenticationError,
  InvalidCredentialsError,
  TokenExpiredError,
  InvalidTokenError,
  AccountNotVerifiedError,
  
  // Authorization
  AuthorizationError,
  ForbiddenError,
  InsufficientPermissionsError,
  AccountSuspendedError,
  
  // Not Found
  NotFoundError,
  RouteNotFoundError,
  
  // Conflict
  ConflictError,
  DuplicateError,
  AlreadyExistsError,
  
  // Rate Limit
  RateLimitError,
  TooManyAttemptsError,
  
  // Server
  InternalServerError,
  DatabaseError,
  ExternalServiceError,
  ServiceUnavailableError,
  
  // Business Logic
  BusinessLogicError,
  InvalidStateError,
  OperationNotAllowedError,
  
  // File
  FileError,
  FileTooLargeError,
  InvalidFileTypeError,
  
  // Payment
  PaymentError,
  InsufficientCreditsError,
  
  // Network
  NetworkError,
  TimeoutError,
  
  // Utilities
  isOperationalError,
  createErrorResponse,
  logError,
  ErrorFactory
};