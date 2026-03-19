import {
  customFetch,
  getNearbyStores,
  type NearbyStoresResponse,
} from "@workspace/api-client-react";

type NearbyStoreArgs = {
  lat?: number;
  lng?: number;
  radius?: number;
};

export async function getNearbyStoresFlexible({
  lat,
  lng,
  radius = 3000,
}: NearbyStoreArgs = {}): Promise<NearbyStoresResponse> {
  if (typeof lat === "number" && typeof lng === "number") {
    return getNearbyStores({ lat, lng, radius });
  }

  // Server falls back to profile coordinates when lat/lng are omitted.
  return customFetch<NearbyStoresResponse>("/api/shopping-list/stores", {
    method: "GET",
  });
}
