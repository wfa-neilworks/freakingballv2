import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        pending: "bg-yellow-500/20 text-yellow-400",
        approved: "bg-brand-lime/20 text-brand-lime",
        rejected: "bg-red-500/20 text-red-400",
        active: "bg-blue-500/20 text-blue-400",
        completed: "bg-white/10 text-white/60",
        cancelled: "bg-red-500/20 text-red-400",
        scheduled: "bg-yellow-500/20 text-yellow-400",
        draft: "bg-white/10 text-white/50",
        registration: "bg-purple-500/20 text-purple-400",
        default: "bg-white/10 text-white/70",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
