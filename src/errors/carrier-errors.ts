/**
 * Base error for carrier integration failures. Subclasses carry specific context.
 */
export class CarrierIntegrationError extends Error {
  constructor(
    message: string,
    public readonly carrierId?: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "CarrierIntegrationError";
    Object.setPrototypeOf(this, CarrierIntegrationError.prototype);
  }
}

/**
 * Thrown when carrier authentication fails (e.g. invalid or expired credentials).
 */
export class AuthenticationError extends CarrierIntegrationError {
  constructor(
    message: string = "Carrier authentication failed",
    carrierId?: string,
    cause?: unknown
  ) {
    super(message, carrierId, cause);
    this.name = "AuthenticationError";
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Thrown when the carrier returns rate limiting (e.g. HTTP 429 or equivalent).
 */
export class RateLimitError extends CarrierIntegrationError {
  constructor(
    message: string = "Carrier rate limit exceeded",
    carrierId?: string,
    public readonly retryAfterSeconds?: number,
    cause?: unknown
  ) {
    super(message, carrierId, cause);
    this.name = "RateLimitError";
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Thrown on network failures (timeout, connection refused, DNS, etc.).
 */
export class NetworkError extends CarrierIntegrationError {
  constructor(
    message: string = "Network error during carrier request",
    carrierId?: string,
    cause?: unknown
  ) {
    super(message, carrierId, cause);
    this.name = "NetworkError";
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Thrown when the carrier response is invalid (malformed JSON, missing fields, wrong shape).
 */
export class InvalidResponseError extends CarrierIntegrationError {
  constructor(
    message: string = "Invalid response from carrier",
    carrierId?: string,
    cause?: unknown
  ) {
    super(message, carrierId, cause);
    this.name = "InvalidResponseError";
    Object.setPrototypeOf(this, InvalidResponseError.prototype);
  }
}
