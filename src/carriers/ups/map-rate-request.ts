import type { Address, Package, RateRequest } from "../../domain/index.js";
import type {
  UpsAddressWithName,
  UpsPackage,
  UpsRateRequestWrapper,
} from "./rating-request-types.js";

const WEIGHT_CODE_LB = "LBS";
const WEIGHT_CODE_KG = "KGS";
const DIM_CODE_IN = "IN";
const DIM_CODE_CM = "CM";
const PACKAGING_TYPE_CODE = "02";
const PACKAGING_TYPE_DESC = "Customer Supplied Package";
const PAYMENT_TYPE_BILL_SHIPPER = "01";

/**
 * Maps carrier-agnostic RateRequest to UPS Rating API request payload.
 * UPS-specific structure only; no logic outside this module.
 */

function mapAddressToUps(
  address: Address,
  /** Assumption: Name is required by UPS; we use city when no explicit name in domain. */
  name: string
): UpsAddressWithName {
  const addressLines = [address.line1];
  if (address.line2) addressLines.push(address.line2);
  return {
    Name: name,
    AddressLine: addressLines,
    City: address.city,
    ...(address.stateOrProvince && { StateProvinceCode: address.stateOrProvince }),
    PostalCode: address.postalCode,
    CountryCode: address.country,
  };
}

/**
 * Assumption: UPS expects weight and dimensions as strings. We round dimensions
 * to integers and weight to 2 decimals for the string representation.
 * TODO: Validate if precision loss from rounding dimensions is acceptable for all carriers
 */
function mapPackageToUps(pkg: Package): UpsPackage {
  const weightCode = pkg.weightUnit === "lb" ? WEIGHT_CODE_LB : WEIGHT_CODE_KG;
  const dimCode = pkg.dimensionUnit === "in" ? DIM_CODE_IN : DIM_CODE_CM;
  return {
    PackagingType: { Code: PACKAGING_TYPE_CODE, Description: PACKAGING_TYPE_DESC },
    Dimensions: {
      UnitOfMeasurement: { Code: dimCode, Description: dimCode },
      Length: String(Math.round(pkg.length)),
      Width: String(Math.round(pkg.width)),
      Height: String(Math.round(pkg.height)),
    },
    PackageWeight: {
      UnitOfMeasurement: { Code: weightCode, Description: weightCode },
      Weight: pkg.weight.toFixed(2),
    },
  };
}

/**
 * Converts domain RateRequest to UPS Rating API body.
 *
 * Assumptions:
 * - Shipper and ShipFrom both use origin address (typical when seller ships from own location).
 * - PaymentDetails uses BillShipper with empty account for published rates; no negotiated rates.
 * - Service is omitted so caller can use requestoption=Shop for all services, or set a default service later.
 */
export function mapRateRequestToUpsPayload(
  request: RateRequest
): UpsRateRequestWrapper {
  const packages = request.packages.map(mapPackageToUps);
  const numOfPieces = String(request.packages.length);

  return {
    RateRequest: {
      Request: {},
      Shipment: {
        Shipper: mapAddressToUps(
          request.origin,
          request.origin.city
        ),
        ShipTo: mapAddressToUps(
          request.destination,
          request.destination.city
        ),
        ShipFrom: mapAddressToUps(
          request.origin,
          request.origin.city
        ),
        PaymentDetails: {
          ShipmentCharge: [
            {
              Type: PAYMENT_TYPE_BILL_SHIPPER,
              BillShipper: { AccountNumber: "" },
            },
          ],
        },
        NumOfPieces: numOfPieces,
        Package: packages.length === 1 ? packages[0]! : packages,
      },
    },
  };
}
