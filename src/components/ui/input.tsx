import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

type InputProps = React.ComponentProps<"input"> & {
  /**
   * "field" (default): 48 px translucent glass pill, no blur.
   * "chrome": blurred glass for the sticky Saved search (D-FLIP-2). Blur
   * makes the field a stacking context, so an absolutely positioned icon
   * drawn before it in the DOM needs `z-10` to stay visible.
   */
  variant?: "field" | "chrome"
}

/** Text field; the look of the Saved search. Clear focus ring. */
function Input({ className, type, variant = "field", ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-variant={variant}
      className={cn(
        "h-12 w-full min-w-0 rounded-field border-0 px-5 py-1 text-base text-fg-primary transition-[box-shadow,background-color] duration-(--dur-fast) ease-soft outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-fg-tertiary focus-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:ring-3 aria-invalid:ring-destructive/40 md:text-body",
        variant === "chrome"
          ? "glass-chrome"
          : "glass-control hover:bg-control-hover focus-visible:bg-control-hover",
        className
      )}
      {...props}
    />
  )
}

export { Input }
