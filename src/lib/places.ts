// Recherche d'entreprises via l'API officielle Google Places (New).
// Doc : https://developers.google.com/maps/documentation/places/web-service/text-search

export type PlaceResult = {
  placeId: string;
  name: string;
  address?: string;
  website?: string;
  phone?: string;
  rating?: number;
  ratingCount?: number;
  mapsUrl?: string;
  types?: string[];
  businessStatus?: string;
};

const FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.websiteUri",
  "places.internationalPhoneNumber",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.types",
  "places.businessStatus",
  "nextPageToken",
].join(",");

/** Requêtes de recherche par secteur (ajustables dans l'interface plus tard). */
export const SECTOR_QUERIES: Record<string, string[]> = {
  immobilier: ["promoteur immobilier", "agence immobilière", "société immobilière"],
  btp: ["entreprise BTP", "entreprise de construction", "bureau d'études ingénierie", "entreprise de forage"],
  services_pro: ["cabinet juridique", "cabinet de conseil", "cabinet de formation", "courtier en assurance", "cabinet RH"],
};

export async function searchPlaces(
  query: string,
  apiKey: string,
  pageToken?: string,
): Promise<{ results: PlaceResult[]; nextPageToken?: string }> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELDS,
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "fr",
      regionCode: "CI",
      pageSize: 20,
      ...(pageToken ? { pageToken } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`Google Places ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    places?: Array<{
      id: string;
      displayName?: { text: string };
      formattedAddress?: string;
      websiteUri?: string;
      internationalPhoneNumber?: string;
      rating?: number;
      userRatingCount?: number;
      googleMapsUri?: string;
      types?: string[];
      businessStatus?: string;
    }>;
    nextPageToken?: string;
  };
  const results = (data.places ?? [])
    .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY")
    .map((p) => ({
      placeId: p.id,
      name: p.displayName?.text ?? "Sans nom",
      address: p.formattedAddress,
      website: p.websiteUri,
      phone: p.internationalPhoneNumber,
      rating: p.rating,
      ratingCount: p.userRatingCount,
      mapsUrl: p.googleMapsUri,
      types: p.types,
      businessStatus: p.businessStatus,
    }));
  return { results, nextPageToken: data.nextPageToken };
}

/** Construit la requête complète : « promoteur immobilier Cocody Abidjan ». */
export function buildQuery(base: string, district: string, city = "Abidjan") {
  return `${base} ${district} ${city}`.trim();
}

/** Devine la commune à partir de l'adresse Google. */
export function guessDistrict(address?: string): string | undefined {
  if (!address) return undefined;
  const known = ["Cocody", "Marcory", "Plateau", "Treichville", "Yopougon", "Bingerville", "Koumassi", "Port-Bouët", "Abobo", "Adjamé", "Attécoubé", "Anyama", "Songon"];
  return known.find((d) => address.toLowerCase().includes(d.toLowerCase()));
}
