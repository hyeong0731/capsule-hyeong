export default function KeywordChips({
  keywords,
  accent,
  align = "center",
  className = "",
}: {
  keywords: string[] | null | undefined;
  accent?: string | null;
  align?: "center" | "start";
  className?: string;
}) {
  if (!keywords || keywords.length === 0) return null;
  const color = accent || "var(--gold-soft)";

  return (
    <ul
      className={`flex flex-wrap gap-1.5 ${
        align === "start" ? "justify-start" : "justify-center"
      } ${className}`.trim()}
    >
      {keywords.map((word) => (
        <li
          key={word}
          className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] tracking-wide"
          style={{ color }}
        >
          {word}
        </li>
      ))}
    </ul>
  );
}
