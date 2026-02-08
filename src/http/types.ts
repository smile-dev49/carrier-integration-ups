/**
 * Response shape returned by the HTTP client.
 */
export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
}

/**
 * Optional request options for HTTP client.
 */
export interface RequestOptions {
  headers?: Record<string, string>;
}

/**
 * Options to simulate failure modes (no real HTTP calls).
 */
export interface MockRequestOptions extends RequestOptions {
  /** Simulate a timeout after a short delay. */
  simulateTimeout?: boolean;
  /** Simulate a response with this status (e.g. 404, 500). */
  simulateStatus?: number;
  /** Simulate malformed JSON in the response (client rejects). */
  simulateMalformedJson?: boolean;
}
