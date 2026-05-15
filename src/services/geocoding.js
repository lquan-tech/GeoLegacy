const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";

function parseAddressRegion(result) {
  const address = result.address ?? {};

  return (
    address.country ||
    address.state ||
    address.region ||
    result.display_name?.split(",").at(-1)?.trim() ||
    "Global"
  );
}

export async function geocodeLocation(query, signal) {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 3) {
    return [];
  }

  const params = new URLSearchParams({
    q: trimmedQuery,
    format: "jsonv2",
    addressdetails: "1",
    limit: "5",
  });

  const response = await fetch(`${NOMINATIM_ENDPOINT}?${params.toString()}`, {
    signal,
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    throw new Error("Location search failed. Please try again.");
  }

  const results = await response.json();

  return results.map((result) => ({
    id: result.place_id?.toString() ?? result.osm_id?.toString() ?? result.display_name,
    name: result.display_name,
    lat: Number(result.lat),
    lng: Number(result.lon),
    region: parseAddressRegion(result),
  }));
}
