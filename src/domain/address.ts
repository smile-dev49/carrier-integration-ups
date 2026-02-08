import { z } from "zod";

export const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  stateOrProvince: z.string().optional(),
  postalCode: z.string().min(1),
  country: z.string().length(2),
});

export type Address = z.infer<typeof addressSchema>;
