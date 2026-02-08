import type { HttpResponse, RequestOptions } from "./types.js";

/**
 * Minimal HTTP client interface. Implement with a real client or mock.
 */
export interface HttpClient {
  post<T = unknown>(
    url: string,
    body: unknown,
    options?: RequestOptions
  ): Promise<HttpResponse<T>>;
}
