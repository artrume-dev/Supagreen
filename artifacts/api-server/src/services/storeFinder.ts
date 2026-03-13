interface NearbyStore {
  name: string;
  address: string;
  distance: number;
  openNow: boolean | null;
  mapsLink: string;
  rating: number | null;
}

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function findNearbyStores(
  lat: number,
  lng: number,
  radius: number = 3000,
): Promise<NearbyStore[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_PLACES_API_KEY is not configured. Please set it in environment secrets.",
    );
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
  );
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", String(radius));
  url.searchParams.set("type", "supermarket");
  url.searchParams.set("keyword", "grocery supermarket health food store");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Google Places API returned ${response.status}`);
  }

  const data = (await response.json()) as {
    status: string;
    results: Array<{
      name: string;
      vicinity: string;
      geometry: { location: { lat: number; lng: number } };
      opening_hours?: { open_now: boolean };
      place_id: string;
      rating?: number;
    }>;
    error_message?: string;
  };

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(
      `Google Places API error: ${data.status} — ${data.error_message ?? "unknown"}`,
    );
  }

  const stores: NearbyStore[] = (data.results || [])
    .map((place) => ({
      name: place.name,
      address: place.vicinity,
      distance: Math.round(
        haversineDistance(
          lat,
          lng,
          place.geometry.location.lat,
          place.geometry.location.lng,
        ),
      ),
      openNow: place.opening_hours?.open_now ?? null,
      mapsLink: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
      rating: place.rating ?? null,
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);

  return stores;
}
