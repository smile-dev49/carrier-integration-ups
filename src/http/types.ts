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
