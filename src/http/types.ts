/**
 * Response shape returned by the HTTP client.
 */
export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
}

/**
 * Options to simulate failure modes (no real HTTP calls).
 */
export interface MockRequestOptions {
  /** Simulate a timeout after a short delay. */
  simulateTimeout?: boolean;
  /** Simulate a response with this status (e.g. 404, 500). */
  simulateStatus?: number;
  /** Simulate malformed JSON in the response (client rejects). */
  simulateMalformedJson?: boolean;
}
