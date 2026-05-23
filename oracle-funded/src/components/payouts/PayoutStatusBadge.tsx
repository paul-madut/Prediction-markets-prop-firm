// Reusable status badge for real payout statuses.
//
// DESIGN.md badge spec: pill, 22px tall, 12px label, semantic alpha-tinted
// backgrounds. Five fixed variants — default / success / danger / warning /
// brand. Each payout status maps to one of those — no inventing new ones.
//
// Real statuses (per packages/db/prisma/schema.prisma):
//   requested | approved | processing | paid | rejected | failed

import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
} from "@heroicons/react/16/solid";

export type PayoutStatus =
  | "requested"
  | "approved"
  | "processing"
  | "paid"
  | "rejected"
  | "failed";

type Variant = "default" | "success" | "danger" | "warning" | "brand";

const VARIANT_CLASSES: Record<Variant, string> = {
  default: "bg-white/[0.06] text-white",
  success: "bg-[rgba(18,223,186,0.14)] text-[#12DFBA]",
  danger: "bg-[rgba(255,28,28,0.14)] text-[#FF1C1C]",
  warning: "bg-[rgba(255,181,57,0.14)] text-[#FFB539]",
  brand: "bg-[rgba(127,36,255,0.18)] text-[#A769FF]",
};

const CONFIG: Record<
  PayoutStatus,
  { label: string; variant: Variant; icon: React.ReactNode }
> = {
  requested: {
    label: "Requested",
    variant: "warning",
    icon: <ClockIcon className="h-3.5 w-3.5" />,
  },
  approved: {
    label: "Approved",
    variant: "brand",
    icon: <CheckCircleIcon className="h-3.5 w-3.5" />,
  },
  processing: {
    label: "Processing",
    variant: "brand",
    icon: <ArrowPathIcon className="h-3.5 w-3.5" />,
  },
  paid: {
    label: "Paid",
    variant: "success",
    icon: <CurrencyDollarIcon className="h-3.5 w-3.5" />,
  },
  rejected: {
    label: "Rejected",
    variant: "danger",
    icon: <XCircleIcon className="h-3.5 w-3.5" />,
  },
  failed: {
    label: "Failed",
    variant: "danger",
    icon: <ExclamationCircleIcon className="h-3.5 w-3.5" />,
  },
};

export function PayoutStatusBadge({
  status,
}: {
  status: PayoutStatus | string;
}) {
  const cfg = CONFIG[status as PayoutStatus] ?? {
    label: typeof status === "string" ? status : "Unknown",
    variant: "default" as Variant,
    icon: <ClockIcon className="h-3.5 w-3.5" />,
  };
  return (
    <span
      className={`inline-flex h-[22px] items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold uppercase tracking-wide ${VARIANT_CLASSES[cfg.variant]}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}
