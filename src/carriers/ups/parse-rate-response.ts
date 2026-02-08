import type { RateQuote } from "../../domain/index.js";
import { rateQuoteSchema } from "../../domain/index.js";
import { InvalidResponseError } from "../../errors/index.js";
import {
  type RatedShipment,
  upsRateResponseWrapperSchema,
} from "./rating-response-schema.js";

const CARRIER_ID = "ups";

/** Default currency when UPS omits it (assumption: USD for US-based usage). */
const DEFAULT_CURRENCY = "USD";

/**
 * Normalizes a single RatedShipment into a RateQuote, or returns null if
 * required fields are missing or invalid (safe handling of malformed data).
 */
function normalizeRatedShipment(shipment: RatedShipment): RateQuote | null {
  const totalCharges = shipment?.TotalCharges;
  const monetaryValue = totalCharges?.MonetaryValue;
  const amount =
    typeof monetaryValue === "number"
      ? monetaryValue
      : typeof monetaryValue === "string"
        ? parseFloat(monetaryValue)
        : NaN;

  if (Number.isNaN(amount) || amount <= 0) {
    return null;
  }

  const currency =
    typeof totalCharges?.CurrencyCode === "string" &&
    totalCharges.CurrencyCode.length === 3
      ? totalCharges.CurrencyCode
      : DEFAULT_CURRENCY;

  const service = shipment?.Service;
  const serviceName =
    typeof service?.Description === "string" && service.Description.length > 0
      ? service.Description
      : typeof service?.Code === "string"
        ? `UPS ${service.Code}`
        : "UPS";

  let estimatedDeliveryDays: number | undefined;
  const timeInTransit = shipment?.TimeInTransit?.BusinessDaysInTransit;
  if (typeof timeInTransit === "string") {
    const days = parseInt(timeInTransit, 10);
    if (Number.isInteger(days) && days > 0) {
      estimatedDeliveryDays = days;
    }
  }

  const quote: RateQuote = {
    serviceName,
    price: { amount, currency },
    ...(estimatedDeliveryDays !== undefined && { estimatedDeliveryDays }),
  };

  const parsed = rateQuoteSchema.safeParse(quote);
  return parsed.success ? parsed.data : null;
}

/**
 * Parses and validates UPS Rating API response into domain RateQuote array.
 * Invalid or malformed RatedShipment entries are skipped; empty or invalid
 * top-level structure throws InvalidResponseError.
 */
export function parseUpsRateResponse(data: unknown): RateQuote[] {
  const parsed = upsRateResponseWrapperSchema.safeParse(data);
  if (!parsed.success) {
    throw new InvalidResponseError(
      "UPS rate response has invalid top-level structure",
      CARRIER_ID,
      parsed.error
    );
  }

  const rateResponse = parsed.data.RateResponse;
  const rawRatedShipment = rateResponse?.RatedShipment;

  if (rawRatedShipment === undefined || rawRatedShipment === null) {
    return [];
  }

  const list = Array.isArray(rawRatedShipment)
    ? rawRatedShipment
    : [rawRatedShipment];

  const quotes: RateQuote[] = [];
  for (const item of list) {
    const quote = normalizeRatedShipment(item);
    if (quote !== null) {
      quotes.push(quote);
    }
  }

  return quotes;
}
