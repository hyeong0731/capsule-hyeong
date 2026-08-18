import {
  formatHumidity,
  formatTemperature,
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
      <span className={`inline-flex items-center gap-1 text-xs text-[var(--muted)] ${className}`.trim()}>
        <span>
          {label}
          {temp ? ` ${temp}` : ""}
        </span>
      </span>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-[var(--line)] bg-[var(--wash)] px-5 py-4 ${className}`.trim()}
    >
      <p className="kicker mb-2">묻은 날의 하늘</p>
      <p className="font-serif text-2xl font-semibold text-[var(--paper)]">
        {label}
      </p>
      {parts.length > 0 ? (
        <p className="mt-1 text-sm text-[var(--muted)]">{parts.join(" · ")}</p>
      ) : null}
    </section>
  );
}
