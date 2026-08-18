export default function AppCanvas({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`app-canvas min-h-full ${className}`.trim()}>
      <div className="app-grain" aria-hidden />
      <div className="relative z-[1] min-h-full">{children}</div>
    </div>
  );
}
