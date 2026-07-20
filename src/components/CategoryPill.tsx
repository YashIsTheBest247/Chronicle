import { categoryColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Category identity is carried by a colour dot rather than a filled chip —
 * seven saturated chips on one screen would fight the editorial palette.
 */
export function CategoryPill({
  category,
  className,
  count,
}: {
  category: string;
  className?: string;
  count?: number;
}) {
  const color = categoryColor(category);
  return (
    <span
      className={cn("pill text-muted", className)}
      style={{ borderColor: `${color}33` }}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: color }}
        aria-hidden="true"
      />
      {category}
      {count !== undefined && (
        <span className="text-faint tabular-nums">{count}</span>
      )}
    </span>
  );
}
