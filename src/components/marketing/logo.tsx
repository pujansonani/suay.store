export function Logo({ tone = "navy" }: { tone?: "navy" | "white" }) {
  const text = tone === "white" ? "text-white" : "text-navy-600";
  const accent = tone === "white" ? "text-teal-200" : "text-teal-500";

  return (
    <span className={`inline-flex items-baseline gap-px text-[1.0625rem] font-semibold tracking-tight ${text}`}>
      <span>Suay</span>
      <span className={accent}>.store</span>
    </span>
  );
}
