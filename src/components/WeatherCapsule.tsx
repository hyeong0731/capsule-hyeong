import { useId } from "react";
import {
  FORM_LABEL,
  type CapsuleForm,
} from "@/lib/capsule-mood";

type WeatherCapsuleProps = {
  form: CapsuleForm | string | null;
  primary: string | null;
  secondary: string | null;
  accent: string | null;
  size?: "card" | "hero";
  className?: string;
};

const FORMS: CapsuleForm[] = [
  "sun",
  "heat",
  "cloud",
  "overcast",
  "rain",
  "snow",
  "mist",
  "breeze",
];

function asForm(value: string | null): CapsuleForm {
  return FORMS.includes(value as CapsuleForm) ? (value as CapsuleForm) : "breeze";
}

export default function WeatherCapsule({
  form,
  primary,
  secondary,
  accent,
  size = "hero",
  className = "",
}: WeatherCapsuleProps) {
  const reactId = useId().replace(/:/g, "");
  const resolved = asForm(form);
  const glass = primary || "#A9B8D0";
  const inner = secondary || "#EEF3FA";
  const trim = accent || "#6E7FA0";
  const gid = (name: string) => `${name}-${reactId}`;
  const wide = size === "hero";

  return (
    <div className={`relative mx-auto ${wide ? "w-40" : "w-24"} ${className}`.trim()}>
      <svg
        viewBox="0 0 160 220"
        className={`h-auto w-full drop-shadow-[0_18px_30px_rgba(0,0,0,0.45)] ${wide ? "animate-[capsule-float_4.5s_ease-in-out_infinite]" : ""}`}
        role="img"
        aria-label={FORM_LABEL[resolved]}
      >
        <defs>
          <linearGradient id={gid("glass")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={inner} />
            <stop offset="55%" stopColor={glass} />
            <stop offset="100%" stopColor={trim} />
          </linearGradient>
          <linearGradient id={gid("shine")} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={gid("glow")} cx="50%" cy="35%" r="55%">
            <stop offset="0%" stopColor={inner} stopOpacity="0.9" />
            <stop offset="100%" stopColor={glass} stopOpacity="0.15" />
          </radialGradient>
          <filter id={gid("soft")} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={resolved === "mist" ? 1.6 : 0.4} />
          </filter>
        </defs>

        {resolved === "sun" || resolved === "heat" ? (
          <g opacity="0.55">
            {Array.from({ length: 10 }).map((_, i) => {
              const angle = (i * Math.PI) / 5;
              const x2 = 80 + Math.cos(angle) * 72;
              const y2 = 118 + Math.sin(angle) * 62;
              return (
                <line
                  key={i}
                  x1="80"
                  y1="118"
                  x2={x2}
                  y2={y2}
                  stroke={trim}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        ) : null}

        {resolved === "breeze" ? (
          <g stroke={trim} strokeWidth="2.4" fill="none" opacity="0.45">
            <path d="M18 70 C40 62, 58 78, 86 70" />
            <path d="M22 92 C48 84, 70 102, 104 90" />
            <path d="M28 158 C52 148, 78 166, 118 152" />
          </g>
        ) : null}

        <ellipse
          cx="80"
          cy="200"
          rx={resolved === "heat" ? 48 : 40}
          ry="8"
          fill={trim}
          opacity="0.18"
        />

        <g filter={`url(#${gid("soft")})`}>
          <path
            d={bodyPath(resolved)}
            fill={`url(#${gid("glass")})`}
            stroke={trim}
            strokeWidth="3"
          />
          <path d={bodyPath(resolved)} fill={`url(#${gid("glow")})`} opacity="0.55" />
          <path
            d="M58 92 C56 120, 58 150, 64 172"
            fill="none"
            stroke={`url(#${gid("shine")})`}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <rect x="64" y="46" width="32" height="22" rx="8" fill={trim} />
          {lid(resolved, trim, inner)}
          {ornament(resolved, trim, inner)}
        </g>
      </svg>
    </div>
  );
}

function bodyPath(form: CapsuleForm): string {
  if (form === "heat") {
    return "M46 78 C40 110, 38 150, 48 182 C60 204, 100 204, 112 182 C122 150, 120 110, 114 78 C108 62, 52 62, 46 78 Z";
  }
  if (form === "rain") {
    return "M54 76 C50 108, 48 148, 56 186 C64 206, 96 206, 104 186 C112 148, 110 108, 106 76 C100 60, 60 60, 54 76 Z";
  }
  if (form === "snow") {
    return "M50 84 L58 70 H102 L110 84 L114 130 L104 186 C96 204, 64 204, 56 186 L46 130 Z";
  }
  if (form === "cloud") {
    return "M42 96 C36 70, 62 54, 80 62 C104 48, 128 70, 118 96 C130 118, 122 170, 108 188 C96 204, 64 204, 52 188 C34 166, 32 124, 42 96 Z";
  }
  return "M50 80 C46 108, 46 150, 54 182 C64 202, 96 202, 106 182 C114 150, 114 108, 110 80 C104 62, 56 62, 50 80 Z";
}

function lid(form: CapsuleForm, trim: string, inner: string) {
  if (form === "rain") {
    return <ellipse cx="80" cy="44" rx="18" ry="22" fill={trim} />;
  }
  if (form === "snow") {
    return (
      <polygon
        points="80,22 96,44 80,50 64,44"
        fill={trim}
        stroke={inner}
        strokeWidth="1.5"
      />
    );
  }
  if (form === "cloud") {
    return (
      <g fill={trim}>
        <circle cx="66" cy="44" r="12" />
        <circle cx="80" cy="38" r="14" />
        <circle cx="96" cy="46" r="11" />
      </g>
    );
  }
  if (form === "sun" || form === "heat") {
    return <circle cx="80" cy="42" r="16" fill={trim} />;
  }
  return <rect x="56" y="34" width="48" height="16" rx="8" fill={trim} />;
}

function ornament(form: CapsuleForm, trim: string, inner: string) {
  if (form === "rain") {
    return (
      <g fill={inner} opacity="0.85">
        <ellipse cx="70" cy="118" rx="4" ry="8" />
        <ellipse cx="88" cy="136" rx="3.5" ry="7" />
        <ellipse cx="76" cy="156" rx="3" ry="6" />
      </g>
    );
  }
  if (form === "snow") {
    return (
      <g stroke={inner} strokeWidth="1.8" fill="none" opacity="0.9">
        <path d="M80 108 l0 28 M68 122 l24 0 M72 114 l16 16 M88 114 l-16 16" />
        <path d="M80 148 l0 18 M72 157 l16 0" />
      </g>
    );
  }
  if (form === "sun" || form === "heat") {
    return (
      <circle cx="80" cy="128" r="18" fill={inner} opacity="0.55" stroke={trim} />
    );
  }
  if (form === "mist") {
    return (
      <g fill={inner} opacity="0.5">
        <ellipse cx="80" cy="120" rx="22" ry="8" />
        <ellipse cx="80" cy="142" rx="18" ry="7" />
        <ellipse cx="80" cy="162" rx="14" ry="6" />
      </g>
    );
  }
  return (
    <g fill={inner} opacity="0.45">
      <ellipse cx="80" cy="124" rx="20" ry="10" />
      <ellipse cx="80" cy="150" rx="16" ry="8" />
    </g>
  );
}
