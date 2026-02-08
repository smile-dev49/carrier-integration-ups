import type { HttpClient } from "./client.js";
import type { HttpResponse, MockRequestOptions } from "./types.js";

const MOCK_DELAY_MS = 50;

/**
 * HTTP client that never performs real requests. Returns mocked responses
 * and can simulate timeouts, error statuses, and malformed JSON via options.
 */
export class MockHttpClient implements HttpClient {
  async post<T = unknown>(
    _url: string,
    body: unknown,
    options?: MockRequestOptions
  ): Promise<HttpResponse<T>> {
    if (options?.simulateTimeout) {
      await this.delay(MOCK_DELAY_MS);
      throw new Error("Request timeout");
    }

    if (options?.simulateMalformedJson) {
      await this.delay(MOCK_DELAY_MS);
      throw new SyntaxError("Unexpected token in JSON");
    }

    if (options?.simulateStatus !== undefined) {
      await this.delay(MOCK_DELAY_MS);
      return {
        status: options.simulateStatus,
        data: { error: `Simulated ${options.simulateStatus}` } as T,
      };
    }

    await this.delay(MOCK_DELAY_MS);
    return {
      status: 200,
      data: body as T,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
