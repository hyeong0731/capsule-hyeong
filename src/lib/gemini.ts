import {
  normalizeMood,
  type CapsuleForm,
  type CapsuleMood,
} from "@/lib/capsule-mood";
import type { WeatherSnapshot } from "@/lib/weather";

const MODEL_CANDIDATES = [
  "gemini-3.7-flash",
  "gemini-2.5-flash",
  "gemini-flash-latest",
] as const;

const MOOD_SCHEMA = {
  type: "object",
  properties: {
    oneLiner: {
      type: "string",
      description:
        "Korean one sentence about this day's weather. Poetic, 20-45 characters. Do not quote the letter.",
    },
    keywords: {
      type: "array",
      items: { type: "string" },
      description:
        "3 to 5 short Korean nouns that hint at the letter without spoiling it.",
    },
    form: {
      type: "string",
      enum: [
        "sun",
        "heat",
        "cloud",
        "overcast",
        "rain",
        "snow",
        "mist",
        "breeze",
      ],
    },
    primary: { type: "string", description: "Hex #RRGGBB for glass." },
    secondary: { type: "string", description: "Hex #RRGGBB for inner light." },
    accent: { type: "string", description: "Hex #RRGGBB for the lid." },
  },
  required: ["oneLiner", "keywords", "form", "primary", "secondary", "accent"],
};

function getGeminiKey(): string {
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }
  return key;
}

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function extractText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text;
  }
  if (typeof data.outputText === "string" && data.outputText.trim()) {
    return data.outputText;
  }

  const outputs = data.outputs;
  if (Array.isArray(outputs)) {
    for (const output of outputs) {
      if (!output || typeof output !== "object") continue;
      const item = output as Record<string, unknown>;
      if (typeof item.text === "string" && item.text.trim()) return item.text;
      const content = item.content;
      if (Array.isArray(content)) {
        for (const part of content) {
          if (
            part &&
            typeof part === "object" &&
            typeof (part as { text?: unknown }).text === "string"
          ) {
            return (part as { text: string }).text;
          }
        }
      }
    }
  }

  const candidates = data.candidates;
  if (Array.isArray(candidates) && candidates[0] && typeof candidates[0] === "object") {
    const parts = (
      candidates[0] as { content?: { parts?: { text?: string }[] } }
    ).content?.parts;
    const text = parts?.map((part) => part.text ?? "").join("") ?? "";
    if (text.trim()) return text;
  }
  return null;
}

function geminiErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: { message?: string; status?: string } }).error;
    if (error?.message) return error.message;
    if (error?.status) return error.status;
  }
  return `Gemini 요청 실패 (${status})`;
}

async function readGeminiResponse(res: Response): Promise<unknown> {
  const payload = (await res.json()) as unknown;
  if (!res.ok) {
    throw new Error(geminiErrorMessage(payload, res.status));
  }
  const text = extractText(payload);
  if (!text) {
    throw new Error("Gemini 응답이 비어 있습니다.");
  }
  return JSON.parse(stripFences(text)) as unknown;
}

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-goog-api-key": getGeminiKey(),
  };
}

async function callGenerateContent(prompt: string, model: string): Promise<unknown> {
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  );
  url.searchParams.set("key", getGeminiKey());

  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    cache: "no-store",
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        responseMimeType: "application/json",
        responseSchema: MOOD_SCHEMA,
      },
    }),
  });
  return readGeminiResponse(res);
}

async function callInteractions(prompt: string, model: string): Promise<unknown> {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: headers(),
    cache: "no-store",
    body: JSON.stringify({
      model,
      input: prompt,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: MOOD_SCHEMA,
      },
    }),
  });
  return readGeminiResponse(res);
}

function buildPrompt(input: {
  weather: WeatherSnapshot | null;
  letter: string;
  recipient: string;
}): string {
  const weather = input.weather;
  const letter = input.letter.trim().slice(0, 1200);
  return [
    "타임캡슐을 묻는 순간을 위한 JSON을 만들어 주세요.",
    "언어는 한국어. 편지의 문장을 그대로 쓰지 마세요. 줄거리 스포일러 금지.",
    `받는 사람: ${input.recipient || "친구"}`,
    `날씨: ${weather?.condition ?? "알 수 없음"}`,
    `기온: ${weather?.temperature ?? "알 수 없음"}`,
    `습도: ${weather?.humidity ?? "알 수 없음"}`,
    `편지 초안: ${letter || "(없음)"}`,
    "oneLiner는 날씨·기온·습도에서 온 그날의 한마디.",
    "keywords는 편지를 열기 전에 보고 아하 할 수 있는 짧은 명사 3~5개.",
    "form과 색은 실제 날씨 분위기에 맞게. primary는 유리, secondary는 속빛, accent는 뚜껑.",
    "맑고 더우면 heat, 맑으면 sun, 구름많음은 cloud, 흐림은 overcast, 비는 rain, 눈은 snow, 습한 흐림은 mist.",
  ].join("\n");
}

function asPartialMood(value: unknown): Partial<CapsuleMood> {
  if (!value || typeof value !== "object") return {};
  const data = value as Record<string, unknown>;
  return {
    oneLiner: typeof data.oneLiner === "string" ? data.oneLiner : undefined,
    keywords: Array.isArray(data.keywords) ? (data.keywords as string[]) : undefined,
    form: data.form as CapsuleForm | undefined,
    primary: typeof data.primary === "string" ? data.primary : undefined,
    secondary: typeof data.secondary === "string" ? data.secondary : undefined,
    accent: typeof data.accent === "string" ? data.accent : undefined,
  };
}

export async function generateCapsuleMood(input: {
  weather: WeatherSnapshot | null;
  letter: string;
  recipient: string;
}): Promise<CapsuleMood> {
  const prompt = buildPrompt(input);
  const errors: string[] = [];

  for (const model of MODEL_CANDIDATES) {
    for (const caller of [callGenerateContent, callInteractions]) {
      try {
        const json = await caller(prompt, model);
        return normalizeMood(asPartialMood(json), input.weather, input.letter);
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown";
        errors.push(`${caller.name}/${model}: ${message}`);
      }
    }
  }

  console.error("[gemini] capsule mood failed", errors.join(" | "));
  throw new Error(errors[0] ?? "캡슐 분위기를 만들지 못했습니다.");
}
