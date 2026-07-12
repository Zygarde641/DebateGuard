export default function FallacyBadge({ name }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-fallacy/15 border border-fallacy/40 px-2 py-0.5 text-xs font-medium text-fallacy">
      {name} 🟠
    </span>
  );
}
