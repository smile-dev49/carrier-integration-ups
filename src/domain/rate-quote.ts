import { z } from "zod";
import { moneySchema } from "./money.js";

export const rateQuoteSchema = z.object({
  serviceName: z.string().min(1),
  price: moneySchema,
  estimatedDeliveryDays: z.number().int().positive().optional(),
});

export type RateQuote = z.infer<typeof rateQuoteSchema>;
