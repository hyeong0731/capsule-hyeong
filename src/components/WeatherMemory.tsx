import {
  formatHumidity,
  formatTemperature,
  weatherEmoji,
} from "@/lib/weather";

type WeatherMemoryProps = {
  condition: string | null;
  temperature: number | string | null;
  humidity: number | string | null;
  compact?: boolean;
  className?: string;
};

export default function WeatherMemory({
  condition,
  temperature,
  humidity,
  compact = false,
  className = "",
}: WeatherMemoryProps) {
  if (!condition && temperature == null && humidity == null) return null;

  const temp = formatTemperature(temperature);
  const humid = formatHumidity(humidity);
  const label = condition ?? "날씨";
  const parts = [temp, humid ? `습도 ${humid}` : null].filter(Boolean);

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs text-slate-500 ${className}`.trim()}>
        <span aria-hidden>{weatherEmoji(condition)}</span>
        <span>
          {label}
          {temp ? ` ${temp}` : ""}
        </span>
      </span>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white px-5 py-4 ${className}`.trim()}
    >
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-sky-700/70">
        묻은 날의 하늘
      </p>
      <p className="text-lg font-semibold text-slate-800">
        <span className="mr-1.5" aria-hidden>
          {weatherEmoji(condition)}
        </span>
        {label}
      </p>
      {parts.length > 0 ? (
        <p className="mt-1 text-sm text-slate-500">{parts.join(" · ")}</p>
      ) : null}
    </section>
  );
}
