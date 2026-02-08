import type { RateQuote, RateRequest } from "../domain/index.js";

/**
 * Generic carrier interface. Implement this to add support for a new carrier.
 * All inputs and outputs use domain types for consistency across carriers.
 */
export interface Carrier {
  /** Unique identifier for this carrier (e.g. "ups"). */
  readonly id: string;

  /**
   * Fetches rate quotes for the given request.
   * Returns normalized RateQuote objects.
   */
  getRates(request: RateRequest): Promise<RateQuote[]>;
}
