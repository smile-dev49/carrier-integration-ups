import type { HttpResponse } from "./types.js";

/**
 * Minimal HTTP client interface. Implement with a real client or mock.
 */
export interface HttpClient {
  post<T = unknown>(url: string, body: unknown): Promise<HttpResponse<T>>;
}
