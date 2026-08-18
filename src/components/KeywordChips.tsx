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
  const color = accent || "#64748b";

  return (
    <ul
      className={`flex flex-wrap gap-1.5 ${
        align === "start" ? "justify-start" : "justify-center"
      } ${className}`.trim()}
    >
      {keywords.map((word) => (
        <li
          key={word}
          className="rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{
            backgroundColor: `${color}18`,
            color,
          }}
        >
          #{word}
        </li>
      ))}
    </ul>
  );
}
