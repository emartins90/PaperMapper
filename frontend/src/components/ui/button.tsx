import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        light: "bg-primary-100 text-foreground shadow-xs hover:bg-primary/100",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        xl: "h-12 rounded-md px-8 py-3 text-base font-semibold has-[>svg]:px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * Button component with support for variants and a 'danger' prop.
 * The 'danger' prop applies red/danger styling to any variant.
 */
function Button({
  className,
  variant,
  size,
  asChild = false,
  danger = false, // New prop
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /**
     * If true, applies red/danger styling to the button for any variant.
     */
    danger?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  // Danger classes for each variant
  const dangerClasses =
    variant === "outline"
      ? "border-red-500 text-red-600 hover:bg-red-50 hover:border-red-600"
      : variant === "ghost"
      ? "text-red-600 hover:bg-red-50"
      : variant === "link"
      ? "text-red-600 hover:underline"
      : "bg-red-600 text-white hover:bg-red-700" // default, filled, etc

  return (
    <Comp
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size }),
        danger && dangerClasses,
        className
      )}
      {...props}
    />
  )
}

export { Button, buttonVariants }
