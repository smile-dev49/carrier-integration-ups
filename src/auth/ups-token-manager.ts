import {
  AuthenticationError,
  NetworkError,
  InvalidResponseError,
  RateLimitError,
} from "../errors/index.js";
import type { HttpClient } from "../http/client.js";

const DEFAULT_UPS_AUTH_URL = "https://onboarding.ups.com/security/v1/oauth/token";
const CARRIER_ID = "ups";

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

interface UpsTokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
}

function isTokenResponse(
  data: unknown
): data is { access_token: string; expires_in?: number } {
  return (
    typeof data === "object" &&
    data !== null &&
    "access_token" in data &&
    typeof (data as UpsTokenResponse).access_token === "string"
  );
}

function getEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new AuthenticationError(
      `Missing required environment variable: ${name}`,
      CARRIER_ID
    );
  }
  return value;
}

/**
 * UPS OAuth 2.0 client-credentials token manager. Caches token in memory,
 * tracks expiry, and refreshes automatically when expired. Config from env.
 */
export class UpsTokenManager {
  private cache: TokenCache | null = null;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly authUrl: string;
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient, config?: {
    clientId?: string;
    clientSecret?: string;
    authUrl?: string;
  }) {
    this.httpClient = httpClient;
    this.clientId = config?.clientId ?? getEnv("UPS_CLIENT_ID");
    this.clientSecret = config?.clientSecret ?? getEnv("UPS_CLIENT_SECRET");
    this.authUrl = config?.authUrl ?? (process.env["UPS_AUTH_URL"] ?? DEFAULT_UPS_AUTH_URL);
  }

  /**
   * Returns a valid access token, from cache or by refreshing.
   */
  async getToken(): Promise<string> {
    if (this.isTokenValid()) {
      return this.cache!.accessToken;
    }
    return this.refreshToken();
  }

  private isTokenValid(): boolean {
    if (this.cache === null) return false;
    const bufferSeconds = 60;
    return Date.now() < this.cache.expiresAt - bufferSeconds * 1000;
  }

  private async refreshToken(): Promise<string> {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
    }).toString();

    const auth = Buffer.from(
      `${this.clientId}:${this.clientSecret}`,
      "utf-8"
    ).toString("base64");

    let res: { status: number; data: UpsTokenResponse };
    try {
      res = await this.httpClient.post<UpsTokenResponse>(this.authUrl, body, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${auth}`,
        },
      });
    } catch (err) {
      throw new NetworkError(
        "Failed to request UPS token",
        CARRIER_ID,
        err
      );
    }

    if (res.status === 401) {
      throw new AuthenticationError(
        "UPS rejected client credentials",
        CARRIER_ID,
        res.data
      );
    }

    if (res.status === 429) {
      throw new RateLimitError(
        "UPS token endpoint rate limited",
        CARRIER_ID,
        undefined,
        res.data
      );
    }

    if (res.status >= 400) {
      throw new AuthenticationError(
        `UPS token request failed with status ${res.status}`,
        CARRIER_ID,
        res.data
      );
    }

    if (!isTokenResponse(res.data)) {
      throw new InvalidResponseError(
        "UPS token response missing access_token",
        CARRIER_ID
      );
    }

    const expiresIn = res.data.expires_in ?? 3600;
    this.cache = {
      accessToken: res.data.access_token,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    return this.cache.accessToken;
  }
}
