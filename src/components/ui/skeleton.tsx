import { cn } from "@/lib/utils"

/** Stock shadcn skeleton; the pulse stops under reduced motion (D-FLIP-3). */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted motion-reduce:animate-none", className)}
      {...props}
    />
  )
}

export { Skeleton }
