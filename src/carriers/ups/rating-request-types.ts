export interface UpsAddress {
  AddressLine: string[];
  City: string;
  StateProvinceCode?: string;
  PostalCode: string;
  CountryCode: string;
}

export interface UpsAddressWithName extends UpsAddress {
  Name: string;
}

export interface UpsDimensions {
  UnitOfMeasurement: { Code: "IN" | "CM"; Description: string };
  Length: string;
  Width: string;
  Height: string;
}

export interface UpsPackageWeight {
  UnitOfMeasurement: { Code: "LBS" | "KGS"; Description: string };
  Weight: string;
}

export interface UpsPackage {
  PackagingType: { Code: string; Description: string };
  Dimensions: UpsDimensions;
  PackageWeight: UpsPackageWeight;
}

export interface UpsShipmentCharge {
  Type: string;
  BillShipper: { AccountNumber: string };
}

export interface UpsShipment {
  Shipper: UpsAddressWithName;
  ShipTo: UpsAddressWithName;
  ShipFrom: UpsAddressWithName;
  PaymentDetails: { ShipmentCharge: UpsShipmentCharge[] };
  Service?: { Code: string; Description: string };
  NumOfPieces: string;
  Package: UpsPackage | UpsPackage[];
}

export interface UpsRateRequest {
  Request?: { TransactionReference?: { CustomerContext?: string } };
  Shipment: UpsShipment;
}

export interface UpsRateRequestWrapper {
  RateRequest: UpsRateRequest;
}
