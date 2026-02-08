import type { HttpResponse, RequestOptions } from "./types.js";

export interface HttpClient {
  post<T = unknown>(
    url: string,
    body: unknown,
    options?: RequestOptions
  ): Promise<HttpResponse<T>>;
}
