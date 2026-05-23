// Reusable status badge for real payout statuses (matches the mock UI's
// visual language: pill-shaped, soft background + dark text, icon).
//
// Real statuses (per packages/db/prisma/schema.prisma + the SQL check):
// requested | approved | processing | paid | rejected | failed

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

const CONFIG: Record<
 PayoutStatus,
 { label: string; color: string; icon: React.ReactNode }
> = {
 requested: {
 label: "Requested",
 color: "bg-[#FFB539]/15 text-amber-800",
 icon: <ClockIcon className="w-3.5 h-3.5" />,
 },
 approved: {
 label: "Approved",
 color: "bg-[#7F24FF]/15 text-blue-800",
 icon: <CheckCircleIcon className="w-3.5 h-3.5" />,
 },
 processing: {
 label: "Processing",
 color: "bg-indigo-100 text-indigo-800",
 icon: <ArrowPathIcon className="w-3.5 h-3.5" />,
 },
 paid: {
 label: "Paid",
 color: "bg-[#12DFBA]/15 text-green-800",
 icon: <CurrencyDollarIcon className="w-3.5 h-3.5" />,
 },
 rejected: {
 label: "Rejected",
 color: "bg-[#FF1C1C]/15 text-red-800",
 icon: <XCircleIcon className="w-3.5 h-3.5" />,
 },
 failed: {
 label: "Failed",
 color: "bg-rose-100 text-rose-800",
 icon: <ExclamationCircleIcon className="w-3.5 h-3.5" />,
 },
};

export function PayoutStatusBadge({ status }: { status: PayoutStatus | string }) {
 const cfg = CONFIG[(status as PayoutStatus)] ?? {
 label: status,
 color: "bg-white/[0.06] text-white",
 icon: <ClockIcon className="w-3.5 h-3.5" />,
 };
 return (
 <span
 className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}
 >
 {cfg.icon}
 {cfg.label}
 </span>
 );
}
