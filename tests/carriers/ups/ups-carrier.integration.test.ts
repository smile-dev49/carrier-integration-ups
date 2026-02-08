import { describe, it, expect, beforeEach } from "vitest";
import { UpsCarrier } from "../../../src/carriers/ups/ups-carrier.js";
import { UpsTokenManager } from "../../../src/auth/index.js";
import { StubHttpClient } from "../../helpers/stub-http-client.js";
import {
  AuthenticationError,
  InvalidResponseError,
  NetworkError,
  RateLimitError,
} from "../../../src/errors/index.js";
import type { RateRequest } from "../../../src/domain/index.js";
import { rateRequestSchema } from "../../../src/domain/index.js";

const AUTH_URL = "https://auth.test/oauth/token";
const RATING_URL = "https://rating.test/api/rating/v2409/Shop";

function upsAuthResponse(expiresInSeconds = 3600) {
  return {
    status: 200,
    data: {
      access_token: "test-token-abc123",
      token_type: "Bearer",
      expires_in: expiresInSeconds,
    },
  };
}

function upsRatingResponse() {
  return {
    status: 200,
    data: {
      RateResponse: {
        RatedShipment: [
          {
            Service: { Code: "03", Description: "Ground" },
            TotalCharges: { CurrencyCode: "USD", MonetaryValue: "24.50" },
            TimeInTransit: { BusinessDaysInTransit: "3" },
          },
          {
            Service: { Code: "12", Description: "3 Day Select" },
            TotalCharges: { CurrencyCode: "USD", MonetaryValue: "38.00" },
            TimeInTransit: { BusinessDaysInTransit: "3" },
          },
        ],
      },
    },
  };
}

function buildValidRateRequest(): RateRequest {
  return rateRequestSchema.parse({
    origin: {
      line1: "123 Origin St",
      city: "Timonium",
      stateOrProvince: "MD",
      postalCode: "21093",
      country: "US",
    },
    destination: {
      line1: "456 Dest Ave",
      city: "Alpharetta",
      stateOrProvince: "GA",
      postalCode: "30005",
      country: "US",
    },
    packages: [
      { weight: 2.5, length: 10, width: 8, height: 6, weightUnit: "lb", dimensionUnit: "in" },
    ],
  });
}

describe("UpsCarrier integration", () => {
  let stub: StubHttpClient;
  let tokenManager: UpsTokenManager;
  let carrier: UpsCarrier;

  beforeEach(() => {
    stub = new StubHttpClient()
      .setAuthUrlPattern(AUTH_URL)
      .setRatingUrlPattern(RATING_URL);
    tokenManager = new UpsTokenManager(stub, {
      clientId: "test-client",
      clientSecret: "test-secret",
      authUrl: AUTH_URL,
    });
    carrier = new UpsCarrier({
      httpClient: stub,
      tokenManager,
      ratingUrl: RATING_URL,
    });
  });

  describe("request construction", () => {
    it("maps origin address to ShipFrom and Shipper, destination to ShipTo", async () => {
      stub.stubAuthResponse(upsAuthResponse());
      stub.stubRatingResponse(upsRatingResponse());

      const request = buildValidRateRequest();
      await carrier.getRates(request);

      expect(stub.ratingCalls).toHaveLength(1);
      const sent = stub.ratingCalls[0]!.body as Record<string, unknown>;
      expect(sent.RateRequest).toBeDefined();
      const shipment = (sent.RateRequest as Record<string, unknown>).Shipment as Record<string, unknown>;
      const shipFrom = shipment.ShipFrom as Record<string, unknown>;
      const shipTo = shipment.ShipTo as Record<string, unknown>;
      const shipper = shipment.Shipper as Record<string, unknown>;
      expect(shipFrom.PostalCode).toBe("21093");
      expect(shipTo.PostalCode).toBe("30005");
      expect(shipper.PostalCode).toBe("21093");
    });

    it("converts package weight and dimension units to UPS format", async () => {
      stub.stubAuthResponse(upsAuthResponse());
      stub.stubRatingResponse(upsRatingResponse());

      const request = buildValidRateRequest();
      await carrier.getRates(request);

      const shipment = (stub.ratingCalls[0]!.body as Record<string, unknown>).RateRequest as Record<string, unknown>;
      const pkg = (shipment.Shipment as Record<string, unknown>).Package as Record<string, unknown>;
      expect(pkg.Dimensions).toBeDefined();
      expect((pkg.Dimensions as Record<string, unknown>).UnitOfMeasurement).toEqual({ Code: "IN", Description: "IN" });
      expect((pkg.PackageWeight as Record<string, unknown>).UnitOfMeasurement).toEqual({ Code: "LBS", Description: "LBS" });
      expect((pkg.PackageWeight as Record<string, unknown>).Weight).toBe("2.50");
    });

    it("attaches Bearer token and Content-Type headers to rating request", async () => {
      stub.stubAuthResponse(upsAuthResponse());
      stub.stubRatingResponse(upsRatingResponse());

      await carrier.getRates(buildValidRateRequest());

      expect(stub.ratingCalls[0]!.headers?.Authorization).toBe("Bearer test-token-abc123");
      expect(stub.ratingCalls[0]!.headers?.["Content-Type"]).toBe("application/json");
    });
  });

  describe("response normalization", () => {
    it("parses UPS response into RateQuote with service name, price, and delivery days", async () => {
      stub.stubAuthResponse(upsAuthResponse());
      stub.stubRatingResponse(upsRatingResponse());

      const quotes = await carrier.getRates(buildValidRateRequest());

      expect(quotes).toHaveLength(2);
      expect(quotes[0]).toEqual({
        serviceName: "Ground",
        price: { amount: 24.5, currency: "USD" },
        estimatedDeliveryDays: 3,
      });
      expect(quotes[1]).toEqual({
        serviceName: "3 Day Select",
        price: { amount: 38, currency: "USD" },
        estimatedDeliveryDays: 3,
      });
    });

    it("uses service code as fallback when Description is missing", async () => {
      stub.stubAuthResponse(upsAuthResponse());
      stub.stubRatingResponse({
        status: 200,
        data: {
          RateResponse: {
            RatedShipment: [
              {
                Service: { Code: "07" },
                TotalCharges: { CurrencyCode: "USD", MonetaryValue: "15.00" },
              },
            ],
          },
        },
      });

      const quotes = await carrier.getRates(buildValidRateRequest());

      expect(quotes[0]!.serviceName).toBe("UPS 07");
      expect(quotes[0]!.price).toEqual({ amount: 15, currency: "USD" });
    });
  });

  describe("OAuth token reuse and refresh", () => {
    it("reuses cached token for multiple requests without re-authenticating", async () => {
      stub.stubAuthResponse(upsAuthResponse(3600));
      stub.stubRatingResponse(upsRatingResponse(), upsRatingResponse());

      await carrier.getRates(buildValidRateRequest());
      await carrier.getRates(buildValidRateRequest());

      expect(stub.authCalls).toHaveLength(1);
      expect(stub.ratingCalls).toHaveLength(2);
    });

    it("automatically refreshes expired token before second request", async () => {
      stub.stubAuthResponse(upsAuthResponse(0), upsAuthResponse(3600));
      stub.stubRatingResponse(upsRatingResponse(), upsRatingResponse());

      await carrier.getRates(buildValidRateRequest());
      await carrier.getRates(buildValidRateRequest());

      expect(stub.authCalls).toHaveLength(2);
      expect(stub.ratingCalls).toHaveLength(2);
    });
  });

  describe("error handling", () => {
    it("throws AuthenticationError when UPS rejects authorization (401)", async () => {
      stub.stubAuthResponse(upsAuthResponse());
      stub.stubRatingResponse({ status: 401, data: { message: "Unauthorized" } });

      await expect(carrier.getRates(buildValidRateRequest())).rejects.toThrow(
        AuthenticationError
      );
      expect(stub.ratingCalls).toHaveLength(1);
    });

    it("throws RateLimitError when UPS rate limits the request (429)", async () => {
      stub.stubAuthResponse(upsAuthResponse());
      stub.stubRatingResponse({ status: 429, data: {} });

      await expect(carrier.getRates(buildValidRateRequest())).rejects.toThrow(
        RateLimitError
      );
    });

    it("throws NetworkError when UPS returns server error (5xx)", async () => {
      stub.stubAuthResponse(upsAuthResponse());
      stub.stubRatingResponse({ status: 503, data: { error: "Service Unavailable" } });

      await expect(carrier.getRates(buildValidRateRequest())).rejects.toThrow(
        NetworkError
      );
    });

    it("throws NetworkError when UPS returns client error other than 401/429 (4xx)", async () => {
      stub.stubAuthResponse(upsAuthResponse());
      stub.stubRatingResponse({ status: 400, data: { message: "Bad Request" } });

      await expect(carrier.getRates(buildValidRateRequest())).rejects.toThrow(
        NetworkError
      );
    });

    it("throws NetworkError when request times out", async () => {
      stub.stubAuthResponse(upsAuthResponse());
      stub.stubRatingResponse(() =>
        Promise.reject(new Error("Request timeout"))
      );

      await expect(carrier.getRates(buildValidRateRequest())).rejects.toThrow(
        NetworkError
      );
    });

    it("throws InvalidResponseError when response has invalid structure", async () => {
      stub.stubAuthResponse(upsAuthResponse());
      stub.stubRatingResponse({
        status: 200,
        data: null,
      });

      await expect(carrier.getRates(buildValidRateRequest())).rejects.toThrow(
        InvalidResponseError
      );
    });

    it("throws NetworkError when transport layer fails with malformed JSON", async () => {
      stub.stubAuthResponse(upsAuthResponse());
      stub.stubRatingResponse(() =>
        Promise.reject(new SyntaxError("Unexpected token in JSON"))
      );

      await expect(carrier.getRates(buildValidRateRequest())).rejects.toThrow(
        NetworkError
      );
    });
  });
});
