import { z } from "zod";
import { addressSchema } from "./address.js";
import { packageSchema } from "./package.js";

export const rateRequestSchema = z.object({
  origin: addressSchema,
  destination: addressSchema,
  packages: z.array(packageSchema).min(1),
});

export type RateRequest = z.infer<typeof rateRequestSchema>;
