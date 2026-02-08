import { z } from "zod";

export const moneySchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3),
});

export type Money = z.infer<typeof moneySchema>;
