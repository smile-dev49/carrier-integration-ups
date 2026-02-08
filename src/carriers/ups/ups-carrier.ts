import type { RateQuote, RateRequest } from "../../domain/index.js";
import {
  AuthenticationError,
  InvalidResponseError,
  NetworkError,
  RateLimitError,
} from "../../errors/index.js";
import type { HttpClient } from "../../http/client.js";
import type { UpsTokenManager } from "../../auth/index.js";
import type { Carrier } from "../carrier.js";
import { mapRateRequestToUpsPayload } from "./map-rate-request.js";
import { parseUpsRateResponse } from "./parse-rate-response.js";

const CARRIER_ID = "ups";

/** Default Rating API URL (Shop = all services). Override with UPS_RATING_URL. */
const DEFAULT_RATING_URL =
  "https://onlinetools.ups.com/api/rating/v2409/Shop";

export interface UpsCarrierOptions {
  /** HTTP client for Rating API calls. */
  httpClient: HttpClient;
  /** Token manager; auth is applied transparently on each request. */
  tokenManager: UpsTokenManager;
  /** Rating API endpoint (POST). Default from env UPS_RATING_URL or DEFAULT_RATING_URL. */
  ratingUrl?: string;
}

/**
 * UPS carrier implementation. Uses OAuth token manager for auth;
 * callers use getRates() without any auth parameters.
 */
export class UpsCarrier implements Carrier {
  readonly id = CARRIER_ID;

  private readonly httpClient: HttpClient;
  private readonly tokenManager: UpsTokenManager;
  private readonly ratingUrl: string;

  constructor(options: UpsCarrierOptions) {
    this.httpClient = options.httpClient;
    this.tokenManager = options.tokenManager;
    this.ratingUrl =
      options.ratingUrl ??
      (typeof process !== "undefined" && process.env["UPS_RATING_URL"]) ??
      DEFAULT_RATING_URL;
  }

  async getRates(request: RateRequest): Promise<RateQuote[]> {
    const token = await this.tokenManager.getToken();
    const payload = mapRateRequestToUpsPayload(request);

    let res: { status: number; data: unknown };
    try {
      res = await this.httpClient.post<unknown>(this.ratingUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      throw new NetworkError(
        "UPS rating request failed",
        CARRIER_ID,
        err
      );
    }

    if (res.status === 401) {
      throw new AuthenticationError(
        "UPS rejected authorization",
        CARRIER_ID,
        res.data
      );
    }

    if (res.status === 429) {
      throw new RateLimitError(
        "UPS rating rate limit exceeded",
        CARRIER_ID,
        undefined,
        res.data
      );
    }

    if (res.status >= 400) {
      throw new NetworkError(
        `UPS rating request failed with status ${res.status}`,
        CARRIER_ID,
        res.data
      );
    }

    try {
      return parseUpsRateResponse(res.data);
    } catch (err) {
      if (err instanceof InvalidResponseError) {
        throw err;
      }
      throw new InvalidResponseError(
        "Failed to parse UPS rate response",
        CARRIER_ID,
        err
      );
    }
  }
}
