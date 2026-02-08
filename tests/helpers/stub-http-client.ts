import type { HttpClient } from "../../src/http/client.js";
import type { HttpResponse } from "../../src/http/types.js";

type ResponseOrThrow<T = unknown> =
  | HttpResponse<T>
  | (() => Promise<HttpResponse<T>>)
  | (() => Promise<never>);

/**
 * Stub HTTP client for integration tests. Records all POST calls and returns
 * configured responses per URL (auth vs rating). No real HTTP.
 */
export class StubHttpClient implements HttpClient {
  readonly authCalls: { url: string; body: unknown; headers?: Record<string, string> }[] = [];
  readonly ratingCalls: { url: string; body: unknown; headers?: Record<string, string> }[] = [];

  private authResponses: ResponseOrThrow[] = [];
  private ratingResponses: ResponseOrThrow<unknown>[] = [];
  private authUrlPattern: string | RegExp = "oauth";
  private ratingUrlPattern: string | RegExp = "rating";

  /** Match URL for auth (default: URL includes "oauth"). */
  setAuthUrlPattern(pattern: string | RegExp): this {
    this.authUrlPattern = pattern;
    return this;
  }

  /** Match URL for rating (default: URL includes "rating"). */
  setRatingUrlPattern(pattern: string | RegExp): this {
    this.ratingUrlPattern = pattern;
    return this;
  }

  /** Queue response(s) for the next auth call(s). */
  stubAuthResponse(...responses: ResponseOrThrow[]): this {
    this.authResponses.push(...responses);
    return this;
  }

  /** Queue response(s) for the next rating call(s). */
  stubRatingResponse(...responses: ResponseOrThrow<unknown>[]): this {
    this.ratingResponses.push(...responses);
    return this;
  }

  private matches(url: string, pattern: string | RegExp): boolean {
    if (typeof pattern === "string") return url.includes(pattern);
    return pattern.test(url);
  }

  async post<T = unknown>(
    url: string,
    body: unknown,
    options?: { headers?: Record<string, string> }
  ): Promise<HttpResponse<T>> {
    const record = { url, body, headers: options?.headers };
    if (this.matches(url, this.authUrlPattern)) {
      this.authCalls.push(record);
      const next = this.authResponses.shift();
      if (next === undefined) {
        throw new Error("StubHttpClient: no stubbed auth response");
      }
      const res = typeof next === "function" ? await next() : next;
      return res as HttpResponse<T>;
    }
    if (this.matches(url, this.ratingUrlPattern)) {
      this.ratingCalls.push(record);
      const next = this.ratingResponses.shift();
      if (next === undefined) {
        throw new Error("StubHttpClient: no stubbed rating response");
      }
      const res = typeof next === "function" ? await next() : next;
      return res as HttpResponse<T>;
    }
    throw new Error(`StubHttpClient: unexpected URL ${url}`);
  }
}
