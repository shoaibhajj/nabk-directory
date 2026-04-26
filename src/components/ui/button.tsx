import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground border border-[var(--color-primary-border)] shadow-cta hover:opacity-95 focus-visible:ring-[var(--color-primary)]",
        accent:
          "bg-accent text-accent-foreground border border-[var(--color-accent-border)] shadow-card hover:opacity-95 focus-visible:ring-[var(--color-accent)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[#D9F0DC] focus-visible:ring-[var(--color-accent)]",
        outline:
          "border border-[var(--color-border)] bg-transparent text-foreground hover:bg-muted",
        ghost:
          "bg-transparent text-foreground hover:bg-muted",
        whatsapp:
          "bg-[#25D366] text-white border border-[#1DA851] hover:opacity-95",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-95",
      },
      size: {
        sm: "h-9 px-4 text-sm rounded-full",
        md: "h-11 px-6 text-base rounded-full",
        lg: "h-14 px-8 text-lg rounded-full",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
