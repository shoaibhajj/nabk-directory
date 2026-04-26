import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-secondary text-secondary-foreground",
  accent: "bg-[var(--color-accent)] text-white",
  outline: "bg-transparent border border-border text-foreground",
  warning: "bg-amber-100 text-amber-800",
  destructive: "bg-red-100 text-red-700",
} as const;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
