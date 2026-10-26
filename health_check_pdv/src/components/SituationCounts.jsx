import { SITUATIONS } from "@/lib/situations";

// Quantas máquinas há em cada situação, como ícone + número (ex.: ✓ 2  ✕ 1).
// Recebe o objeto `situacoes` da API; situações zeradas não aparecem.
export default function SituationCounts({ counts }) {
  const visible = Object.entries(SITUATIONS).filter(([key]) => counts[key] > 0);

  if (visible.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {visible.map(([key, { label, icon: Icon, iconClassName }]) => (
        <li key={key} className="flex items-center gap-1" title={label}>
          <Icon className={`size-4 ${iconClassName}`} aria-hidden="true" />
          <span>
            {counts[key]}
            <span className="sr-only"> {label}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
