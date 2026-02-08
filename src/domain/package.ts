import { z } from "zod";

export const packageSchema = z.object({
  weight: z.number().positive(),
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  weightUnit: z.enum(["kg", "lb"]).default("kg"),
  dimensionUnit: z.enum(["cm", "in"]).default("cm"),
});

export type Package = z.infer<typeof packageSchema>;
