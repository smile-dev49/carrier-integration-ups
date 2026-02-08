/**
 * Base error for carrier integration failures. Subclasses carry specific context.
 */
export class CarrierIntegrationError extends Error {
  readonly name = "CarrierIntegrationError";

  constructor(
    message: string,
    public readonly carrierId?: string,
    public readonly cause?: unknown
  ) {
    super(message);
    Object.setPrototypeOf(this, CarrierIntegrationError.prototype);
  }
}

/**
 * Thrown when carrier authentication fails (e.g. invalid or expired credentials).
 */
export class AuthenticationError extends CarrierIntegrationError {
  readonly name = "AuthenticationError";

  constructor(
    message: string = "Carrier authentication failed",
    carrierId?: string,
    cause?: unknown
  ) {
    super(message, carrierId, cause);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Thrown when the carrier returns rate limiting (e.g. HTTP 429 or equivalent).
 */
export class RateLimitError extends CarrierIntegrationError {
  readonly name = "RateLimitError";

  constructor(
    message: string = "Carrier rate limit exceeded",
    carrierId?: string,
    public readonly retryAfterSeconds?: number,
    cause?: unknown
  ) {
    super(message, carrierId, cause);
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Thrown on network failures (timeout, connection refused, DNS, etc.).
 */
export class NetworkError extends CarrierIntegrationError {
  readonly name = "NetworkError";

  constructor(
    message: string = "Network error during carrier request",
    carrierId?: string,
    cause?: unknown
  ) {
    super(message, carrierId, cause);
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Thrown when the carrier response is invalid (malformed JSON, missing fields, wrong shape).
 */
export class InvalidResponseError extends CarrierIntegrationError {
  readonly name = "InvalidResponseError";

  constructor(
    message: string = "Invalid response from carrier",
    carrierId?: string,
    cause?: unknown
  ) {
    super(message, carrierId, cause);
    Object.setPrototypeOf(this, InvalidResponseError.prototype);
  }
}
