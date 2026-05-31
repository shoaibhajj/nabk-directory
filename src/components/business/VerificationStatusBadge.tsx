import { VerificationStatus } from "@prisma/client";

const config: Record<
  VerificationStatus,
  { label: string; className: string; icon: string }
> = {
  UNVERIFIED: {
    label: "غير موثّق",
    className: "bg-gray-100 text-gray-600",
    icon: "○",
  },
  PENDING: {
    label: "قيد المراجعة",
    className: "bg-yellow-100 text-yellow-700",
    icon: "⏳",
  },
  VERIFIED: {
    label: "موثّق",
    className: "bg-green-100 text-green-700",
    icon: "✓",
  },
  REJECTED: {
    label: "مرفوض",
    className: "bg-red-100 text-red-700",
    icon: "✕",
  },
};

export function VerificationStatusBadge({
  status,
}: {
  status: VerificationStatus;
}) {
  const { label, className, icon } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}
