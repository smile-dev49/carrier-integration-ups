import { z } from "zod";

const totalChargesSchema = z.object({
  CurrencyCode: z.string().optional(),
  MonetaryValue: z.union([z.string(), z.number()]).optional(),
});

const serviceSchema = z.object({
  Code: z.string().optional(),
  Description: z.string().optional(),
});

export const ratedShipmentSchema = z.object({
  Service: serviceSchema.optional(),
  TotalCharges: totalChargesSchema.optional(),
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

export const upsRateResponseWrapperSchema = z.object({
  RateResponse: rateResponseSchema.optional(),
});

export type UpsRateResponseWrapper = z.infer<typeof upsRateResponseWrapperSchema>;
