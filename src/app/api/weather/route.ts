import { reverseGeocodeKo } from "@/lib/geocode";
import { fetchCurrentWeather } from "@/lib/kma";
import { DEFAULT_LOCATION, isInKoreaGrid } from "@/lib/weather";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat") ?? DEFAULT_LOCATION.lat);
  const lon = Number(url.searchParams.get("lon") ?? DEFAULT_LOCATION.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return Response.json({ error: "위치 값이 올바르지 않습니다." }, { status: 400 });
  }
  if (!isInKoreaGrid(lat, lon)) {
    return Response.json({ error: "한반도 격자 범위 밖의 위치입니다." }, { status: 400 });
  }

  try {
    const [weather, location] = await Promise.all([
      fetchCurrentWeather(lat, lon),
      reverseGeocodeKo(lat, lon),
    ]);
    return Response.json({
      ...weather,
      location: location ?? fallbackLocationLabel(lat, lon),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "날씨를 불러오지 못했습니다.";
    return Response.json({ error: message }, { status: 502 });
  }
}

function fallbackLocationLabel(lat: number, lon: number): string {
  const nearDefault =
    Math.abs(lat - DEFAULT_LOCATION.lat) < 0.02 &&
    Math.abs(lon - DEFAULT_LOCATION.lon) < 0.02;
  return nearDefault ? DEFAULT_LOCATION.label : "현재 위치";
}
