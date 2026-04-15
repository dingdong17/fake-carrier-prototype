type BadgeVariant = "critical" | "high" | "medium" | "low" | "success" | "warning" | "info" | "neutral";

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  critical: "bg-ec-error/10 text-ec-error border-ec-error/20",
  high: "bg-ec-red/10 text-ec-red border-ec-red/20",
  medium: "bg-ec-yellow/20 text-yellow-700 border-ec-yellow/30",
  low: "bg-ec-light-green/20 text-ec-dark-green border-ec-light-green/30",
  success: "bg-ec-success/10 text-ec-success border-ec-success/20",
  warning: "bg-ec-warning/10 text-ec-warning border-ec-warning/20",
  info: "bg-ec-info/10 text-ec-info border-ec-info/20",
  neutral: "bg-ec-grey-40 text-ec-grey-80 border-ec-grey-60",
};

export function Badge({ variant, children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
