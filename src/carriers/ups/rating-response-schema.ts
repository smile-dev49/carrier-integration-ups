import { z } from "zod";

/**
 * Zod schemas for UPS Rating API response. Lenient on optional/malformed
 * fields so we can validate external data and normalize safely.
 * @see https://developer.ups.com/api/reference?loc=en_US&tag=Rating
 */

const totalChargesSchema = z.object({
  CurrencyCode: z.string().optional(),
  MonetaryValue: z.union([z.string(), z.number()]).optional(),
});

const serviceSchema = z.object({
  Code: z.string().optional(),
  Description: z.string().optional(),
});

/** Single rated shipment (one service option). */
export const ratedShipmentSchema = z.object({
  Service: serviceSchema.optional(),
  TotalCharges: totalChargesSchema.optional(),
  /** Optional transit time; structure varies (e.g. BusinessDaysInTransit). */
  TimeInTransit: z
    .object({
      BusinessDaysInTransit: z.string().optional(),
    })
    .optional(),
});

export type RatedShipment = z.infer<typeof ratedShipmentSchema>;

const rateResponseSchema = z.object({
  Response: z.object({}).passthrough().optional(),
  RatedShipment: z.union([
    ratedShipmentSchema,
    z.array(ratedShipmentSchema),
  ]).optional(),
});

/** Top-level wrapper: API returns { RateResponse: { ... } }. */
export const upsRateResponseWrapperSchema = z.object({
  RateResponse: rateResponseSchema.optional(),
});

export type UpsRateResponseWrapper = z.infer<typeof upsRateResponseWrapperSchema>;
