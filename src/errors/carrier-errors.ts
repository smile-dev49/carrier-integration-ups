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
