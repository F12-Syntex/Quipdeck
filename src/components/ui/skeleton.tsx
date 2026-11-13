import { cn } from "@/lib/utils"

/**
 * Placeholder block. A faint glass fill with a slow shimmer that stops under
 * reduced motion (D-FLIP-3). Callers set size and radius.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "skeleton-shimmer animate-shimmer rounded-xl motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
