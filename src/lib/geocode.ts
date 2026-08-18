type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  borough?: string;
  city_district?: string;
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  state?: string;
  province?: string;
};

type NominatimReverse = {
  address?: NominatimAddress;
};

function pick(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value?.trim());
}

function shortenRegion(value: string): string {
  return value
    .replace(/특별자치시$/, "")
    .replace(/특별시$|광역시$/, "")
    .replace(/특별자치도$/, "도")
    .trim();
}

export function formatKoreanPlace(address: NominatimAddress): string | null {
  const region = pick(address.city, address.town, address.municipality, address.province, address.state);
  const district = pick(address.borough, address.city_district, address.county);
  const dong = pick(address.suburb, address.quarter, address.neighbourhood, address.village);

  const regionLabel = region ? shortenRegion(region) : undefined;
  const parts: string[] = [];

  if (district) {
    if (regionLabel && !district.includes(regionLabel)) {
      parts.push(regionLabel);
    }
    parts.push(district);
  } else if (regionLabel) {
    parts.push(regionLabel);
  }

  if (dong && parts.length < 2 && !parts.includes(dong)) {
    parts.push(dong);
  }

  const label = parts.slice(0, 2).join(" ").trim();
  return label || null;
}

export async function reverseGeocodeKo(
  lat: number,
  lon: number,
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      format: "jsonv2",
      lat: String(lat),
      lon: String(lon),
      zoom: "14",
      addressdetails: "1",
      "accept-language": "ko",
    });
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "capsule-hyeong/1.0 (live weather)",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as NominatimReverse;
    if (!data.address) return null;
    return formatKoreanPlace(data.address);
  } catch {
    return null;
  }
}
