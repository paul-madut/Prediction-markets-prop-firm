"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircleIcon, XCircleIcon, ClockIcon, ExclamationTriangleIcon, NoSymbolIcon, ArrowPathIcon, DocumentTextIcon, UserGroupIcon, CurrencyDollarIcon, UserIcon } from "@heroicons/react/16/solid";
type HeroIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;
import { cn } from "@/lib/utils";

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

interface EmptyStateProps {
  icon?: HeroIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = ({
  icon: Icon = DocumentTextIcon,
  title,
  description,
  action,
}: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 text-center max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
};

// Predefined empty states for common use cases
export const TradersEmptyState = () => (
  <EmptyState
    icon={UserGroupIcon}
    title="No traders found"
    description="No traders match your current search criteria. Try adjusting your filters or search terms."
  />
);

export const PayoutsEmptyState = () => (
  <EmptyState
    icon={CurrencyDollarIcon}
    title="No payouts found"
    description="There are no payout requests matching your current filter. All caught up!"
  />
);

export const KYCEmptyState = () => (
  <EmptyState
    icon={UserIcon}
    title="No KYC submissions found"
    description="There are no KYC submissions matching your current filter."
  />
);

// ============================================================================
// SKELETON LOADING COMPONENTS
// ============================================================================

const shimmer =
  "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent";

export const TableSkeleton = ({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header skeleton */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
        <div className="flex gap-6">
          {Array.from({ length: columns }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-4 bg-gray-200 rounded",
                shimmer,
                i === 0 ? "w-32" : "w-20"
              )}
            />
          ))}
        </div>
      </div>
      {/* Row skeletons */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="flex items-center gap-6">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div key={colIndex} className="flex-1">
                  {colIndex === 0 ? (
                    <div className="flex items-center gap-3">
                      <div className={cn("h-10 w-10 bg-gray-200 rounded-full", shimmer)} />
                      <div className="space-y-2">
                        <div className={cn("h-4 w-24 bg-gray-200 rounded", shimmer)} />
                        <div className={cn("h-3 w-32 bg-gray-200 rounded", shimmer)} />
                      </div>
                    </div>
                  ) : (
                    <div className={cn("h-4 w-16 bg-gray-200 rounded", shimmer)} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const RowSkeleton = ({ columns = 6 }: { columns?: number }) => {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          {i === 0 ? (
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 bg-gray-200 rounded-full", shimmer)} />
              <div className="space-y-2">
                <div className={cn("h-4 w-24 bg-gray-200 rounded", shimmer)} />
                <div className={cn("h-3 w-32 bg-gray-200 rounded", shimmer)} />
              </div>
            </div>
          ) : (
            <div className={cn("h-4 w-16 bg-gray-200 rounded", shimmer)} />
          )}
        </td>
      ))}
    </tr>
  );
};

// ============================================================================
// ENHANCED STATUS BADGES
// ============================================================================

type StatusType =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "neutral"
  | "primary";

interface StatusBadgeConfig {
  type: StatusType;
  icon?: HeroIcon;
}

const statusTypeStyles: Record<StatusType, string> = {
  success: "bg-green-50 text-green-700 border-green-200 ring-green-600/20",
  error: "bg-red-50 text-red-700 border-red-200 ring-red-600/20",
  warning: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20",
  info: "bg-blue-50 text-blue-700 border-blue-200 ring-blue-600/20",
  neutral: "bg-gray-50 text-gray-700 border-gray-200 ring-gray-600/20",
  primary: "bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-600/20",
};

const statusIcons: Record<StatusType, HeroIcon> = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: ClockIcon,
  neutral: NoSymbolIcon,
  primary: ArrowPathIcon,
};

// Payout status mapping
const payoutStatusMap: Record<string, StatusBadgeConfig> = {
  pending: { type: "warning", icon: ClockIcon },
  approved: { type: "info", icon: CheckCircleIcon },
  processing: { type: "primary", icon: ArrowPathIcon },
  completed: { type: "success", icon: CheckCircleIcon },
  rejected: { type: "error", icon: XCircleIcon },
  failed: { type: "neutral", icon: NoSymbolIcon },
};

// KYC status mapping
const kycStatusMap: Record<string, StatusBadgeConfig> = {
  pending: { type: "warning", icon: ClockIcon },
  under_review: { type: "info", icon: ClockIcon },
  approved: { type: "success", icon: CheckCircleIcon },
  rejected: { type: "error", icon: XCircleIcon },
  expired: { type: "neutral", icon: NoSymbolIcon },
};

// Trader account status mapping
const traderStatusMap: Record<string, StatusBadgeConfig> = {
  active: { type: "success", icon: CheckCircleIcon },
  frozen: { type: "info", icon: ClockIcon },
  suspended: { type: "warning", icon: ExclamationTriangleIcon },
  closed: { type: "neutral", icon: NoSymbolIcon },
};

// Trader KYC status mapping
const traderKycStatusMap: Record<string, StatusBadgeConfig> = {
  pending: { type: "warning", icon: ClockIcon },
  approved: { type: "success", icon: CheckCircleIcon },
  rejected: { type: "error", icon: XCircleIcon },
  expired: { type: "neutral", icon: NoSymbolIcon },
};

// Trader phase mapping
const traderPhaseMap: Record<string, StatusBadgeConfig> = {
  evaluation_1: { type: "primary" },
  evaluation_2: { type: "info" },
  funded: { type: "success" },
};

const phaseLabels: Record<string, string> = {
  evaluation_1: "Eval 1",
  evaluation_2: "Eval 2",
  funded: "Funded",
};

interface EnhancedStatusBadgeProps {
  status: string;
  statusMap: Record<string, StatusBadgeConfig>;
  showIcon?: boolean;
  size?: "sm" | "md";
  labelOverride?: string;
}

export const EnhancedStatusBadge = ({
  status,
  statusMap,
  showIcon = true,
  size = "sm",
  labelOverride,
}: EnhancedStatusBadgeProps) => {
  const config = statusMap[status] || { type: "neutral" as StatusType };
  const Icon = config.icon || statusIcons[config.type];
  const label = labelOverride || status.replace(/_/g, " ");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full border ring-1 ring-inset capitalize",
        statusTypeStyles[config.type],
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      {showIcon && (
        <Icon
          className={cn(
            "flex-shrink-0",
            size === "sm" ? "h-3 w-3" : "h-4 w-4",
            config.icon === ArrowPathIcon && "animate-spin"
          )}
        />
      )}
      {label}
    </span>
  );
};

// Pre-configured badge components
export const PayoutStatusBadge = ({ status }: { status: string }) => (
  <EnhancedStatusBadge status={status} statusMap={payoutStatusMap} />
);

export const KYCStatusBadge = ({ status }: { status: string }) => (
  <EnhancedStatusBadge status={status} statusMap={kycStatusMap} />
);

export const TraderStatusBadge = ({ status }: { status: string }) => (
  <EnhancedStatusBadge status={status} statusMap={traderStatusMap} />
);

export const TraderKYCBadge = ({ status }: { status: string }) => (
  <EnhancedStatusBadge status={status} statusMap={traderKycStatusMap} />
);

export const TraderPhaseBadge = ({ phase }: { phase: string }) => (
  <EnhancedStatusBadge
    status={phase}
    statusMap={traderPhaseMap}
    showIcon={false}
    labelOverride={phaseLabels[phase]}
  />
);

// ============================================================================
// ANIMATED TABLE ROW
// ============================================================================

interface AnimatedTableRowProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
}

export const AnimatedTableRow = ({
  children,
  index = 0,
  className,
}: AnimatedTableRowProps) => {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className={cn(
        "group transition-colors duration-150 ease-in-out hover:bg-gray-50/80",
        className
      )}
    >
      {children}
    </motion.tr>
  );
};

// ============================================================================
// STICKY TABLE HEADER
// ============================================================================

interface StickyTableHeaderProps {
  children: React.ReactNode;
}

export const StickyTableHeader = ({ children }: StickyTableHeaderProps) => {
  return (
    <thead className="sticky top-0 z-10 bg-gray-50 shadow-[0_1px_0_0_rgb(229,231,235)]">
      {children}
    </thead>
  );
};

// ============================================================================
// ACTION BUTTONS (Visible on hover)
// ============================================================================

interface RowActionsProps {
  children: React.ReactNode;
  alwaysVisible?: boolean;
}

export const RowActions = ({ children, alwaysVisible = false }: RowActionsProps) => {
  return (
    <div
      className={cn(
        "flex items-center gap-1 transition-opacity duration-150",
        !alwaysVisible && "opacity-40 group-hover:opacity-100"
      )}
    >
      {children}
    </div>
  );
};

interface ActionButtonProps {
  icon: HeroIcon;
  onClick?: () => void;
  href?: string;
  title: string;
  variant?: "default" | "success" | "danger" | "primary";
  disabled?: boolean;
}

const actionButtonVariants = {
  default: "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
  success: "text-green-600 hover:text-green-700 hover:bg-green-50",
  danger: "text-red-600 hover:text-red-700 hover:bg-red-50",
  primary: "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50",
};

export const ActionButton = ({
  icon: Icon,
  onClick,
  href,
  title,
  variant = "default",
  disabled = false,
}: ActionButtonProps) => {
  const className = cn(
    "p-2 rounded-lg transition-all duration-150 ease-in-out",
    actionButtonVariants[variant],
    disabled && "opacity-50 cursor-not-allowed"
  );

  if (href) {
    // Using dynamic import to avoid issues if Link is not available
    const Link = require("next/link").default;
    return (
      <Link href={href} className={className} title={title}>
        <Icon className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      className={className}
      title={title}
      disabled={disabled}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
};

// ============================================================================
// FILTER PILL (For animated filter buttons)
// ============================================================================

interface FilterPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export const FilterPill = ({ label, active, onClick }: FilterPillProps) => {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize",
        active
          ? "text-white"
          : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
      )}
      whileTap={{ scale: 0.97 }}
    >
      {active && (
        <motion.div
          layoutId="activeFilter"
          className="absolute inset-0 bg-indigo-600 rounded-lg"
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      <span className="relative z-10">{label.replace(/_/g, " ")}</span>
    </motion.button>
  );
};

// ============================================================================
// TABLE CONTAINER WITH STICKY HEADER SUPPORT
// ============================================================================

interface TableContainerProps {
  children: React.ReactNode;
  maxHeight?: string;
}

export const TableContainer = ({
  children,
  maxHeight = "calc(100vh - 300px)",
}: TableContainerProps) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div
        className="overflow-auto"
        style={{ maxHeight }}
      >
        {children}
      </div>
    </div>
  );
};
