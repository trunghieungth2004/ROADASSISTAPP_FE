import { api } from "./client";

export type ShopType = "SHOP" | "MOBILE" | "TOW";

export type TowVehicleType = "CAR" | "VAN" | "TRUCK";

export type Shop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  openHours?: string | null;
  openNow?: boolean | null;
  accepting?: boolean;
  hasTow?: boolean;
  towVehicleType?: string | null;
  towVehicleWidth?: number | null;
  ratingAvg?: number;
  ratingCount?: number;
  distance?: number;
  fitsAlley?: boolean | null;
};

export function nearShops(
  payload: {
    lat: number;
    lng: number;
    radiusMeters?: number;
    type?: ShopType;
    acceptingOnly?: boolean;
    openOnly?: boolean;
    limit?: number;
  },
  token: string,
): Promise<Shop[]> {
  return api.post<Shop[]>("/shops/near", payload, token);
}

export function createShop(
  payload: {
    name: string;
    lat: number;
    lng: number;
    type: ShopType;
    openHours?: string;
    hasTow?: boolean;
    towVehicleType?: TowVehicleType;
    towVehicleWidth?: number;
    operatorUid?: string;
  },
  token: string,
): Promise<Shop> {
  return api.post<Shop>("/shops", payload, token);
}

export function updateShop(
  payload: {
    shopId: string;
    name?: string;
    openHours?: string | null;
    accepting?: boolean;
    hasTow?: boolean;
    towVehicleType?: TowVehicleType | null;
    towVehicleWidth?: number | null;
    operatorUid?: string | null;
  },
  token: string,
): Promise<{ updated: number }> {
  return api.put<{ updated: number }>("/shops", payload, token);
}
