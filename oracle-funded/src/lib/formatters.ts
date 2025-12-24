import { format } from "date-fns";

/**
 * Format cents to USD currency string
 * @param cents - Amount in cents
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
};

/**
 * Format decimal to percentage string
 * @param decimal - Decimal value (0.5 = 50%)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string (e.g., "50.00%")
 */
export const formatPercent = (decimal: number, decimals = 2): string => {
  return `${(decimal * 100).toFixed(decimals)}%`;
};

/**
 * Format ISO date string to readable date
 * @param dateString - ISO date string
 * @param formatString - date-fns format string
 * @returns Formatted date string (e.g., "Jan 15, 2025")
 */
export const formatDate = (dateString: string, formatString = "MMM dd, yyyy"): string => {
  return format(new Date(dateString), formatString);
};

/**
 * Format large numbers to compact notation
 * @param num - Number to format
 * @returns Compact number string (e.g., "1.2M")
 */
export const formatCompactNumber = (num: number): string => {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(num);
};

/**
 * Format volume in cents to readable string
 * @param volumeCents - Volume in cents
 * @returns Formatted volume string (e.g., "$1.2M")
 */
export const formatVolume = (volumeCents: number): string => {
  return `$${formatCompactNumber(volumeCents / 100)}`;
};
