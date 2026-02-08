import type { HttpClient } from "../../src/http/client.js";
import type { HttpResponse } from "../../src/http/types.js";

type ResponseOrThrow<T = unknown> =
  | HttpResponse<T>
  | (() => Promise<HttpResponse<T>>)
  | (() => Promise<never>);

export class StubHttpClient implements HttpClient {
  readonly authCalls: { url: string; body: unknown; headers?: Record<string, string> }[] = [];
  readonly ratingCalls: { url: string; body: unknown; headers?: Record<string, string> }[] = [];

  private authResponses: ResponseOrThrow[] = [];
  private ratingResponses: ResponseOrThrow<unknown>[] = [];
  private authUrlPattern: string | RegExp = "oauth";
  private ratingUrlPattern: string | RegExp = "rating";

  setAuthUrlPattern(pattern: string | RegExp): this {
    this.authUrlPattern = pattern;
    return this;
  }

  setRatingUrlPattern(pattern: string | RegExp): this {
    this.ratingUrlPattern = pattern;
    return this;
  }

  stubAuthResponse(...responses: ResponseOrThrow[]): this {
    this.authResponses.push(...responses);
    return this;
  }

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
