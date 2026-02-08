import type { RateQuote, RateRequest } from "../domain/index.js";

export interface Carrier {
  readonly id: string;
  getRates(request: RateRequest): Promise<RateQuote[]>;
}
