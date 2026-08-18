import { generateCapsuleMood } from "@/lib/gemini";
import { moodFromWeather } from "@/lib/capsule-mood";
import type { WeatherSnapshot } from "@/lib/weather";

type MoodRequest = {
  weather?: WeatherSnapshot | null;
  letter?: string;
  recipient?: string;
};

export async function POST(request: Request) {
  let body: MoodRequest;
  try {
    body = (await request.json()) as MoodRequest;
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const weather = body.weather ?? null;
  const letter = typeof body.letter === "string" ? body.letter : "";
  const recipient = typeof body.recipient === "string" ? body.recipient : "";

  try {
    const mood = await generateCapsuleMood({ weather, letter, recipient });
    return Response.json(mood);
  } catch {
    return Response.json(moodFromWeather(weather, letter));
  }
}
