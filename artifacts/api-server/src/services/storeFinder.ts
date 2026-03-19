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

  // Use Places API (New) Nearby Search endpoint.
  const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.currentOpeningHours.openNow",
    },
    body: JSON.stringify({
      includedTypes: ["supermarket"],
      maxResultCount: 8,
      locationRestriction: {
        circle: {
          center: {
            latitude: lat,
            longitude: lng,
          },
          radius,
        },
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`Google Places API returned ${response.status}`);
  }

  const data = (await response.json()) as {
    places?: Array<{
      id: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude: number; longitude: number };
      rating?: number;
      currentOpeningHours?: { openNow?: boolean };
    }>;
    error?: { message?: string };
  };

  if (data.error?.message) {
    throw new Error(`Google Places API error: ${data.error.message}`);
  }

  const stores: NearbyStore[] = (data.places || [])
    .map((place) => ({
      name: place.displayName?.text ?? "Unknown store",
      address: place.formattedAddress ?? "Address unavailable",
      distance: Math.round(
        haversineDistance(
          lat,
          lng,
          place.location?.latitude ?? lat,
          place.location?.longitude ?? lng,
        ),
      ),
      openNow: place.currentOpeningHours?.openNow ?? null,
      mapsLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.displayName?.text ?? "grocery store")}&query_place_id=${place.id}`,
      rating: place.rating ?? null,
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);

  return stores;
}
