/**
 * CSV Export Utility Functions
 * Handles conversion of data to CSV format and browser downloads
 */

export interface ExportColumn<T = any> {
  key: keyof T | string;
  label: string;
  format?: (value: any, row: T) => string;
}

/**
 * Convert array of objects to CSV string
 * @param data Array of data objects
 * @param columns Column configuration with labels and optional formatters
 * @returns CSV string with BOM for Excel compatibility
 */
export function arrayToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[]
): string {
  if (data.length === 0) {
    return columns.map((col) => escapeCsvValue(col.label)).join(",");
  }

  // Header row
  const header = columns.map((col) => escapeCsvValue(col.label)).join(",");

  // Data rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const value = row[col.key as keyof T];
        const formattedValue = col.format ? col.format(value, row) : value;
        return escapeCsvValue(String(formattedValue ?? ""));
      })
      .join(",");
  });

  // Add BOM (Byte Order Mark) for Excel compatibility
  const bom = "\uFEFF";
  return bom + [header, ...rows].join("\n");
}

/**
 * Escape and quote CSV values that contain special characters
 * @param value String value to escape
 * @returns Escaped and quoted value if necessary
 */
function escapeCsvValue(value: string): string {
  // Convert to string if not already
  const stringValue = String(value);

  // Check if the value needs quoting (contains comma, quote, or newline)
  const needsQuoting =
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r");

  if (needsQuoting) {
    // Escape existing quotes by doubling them
    const escapedValue = stringValue.replace(/"/g, '""');
    return `"${escapedValue}"`;
  }

  return stringValue;
}

/**
 * Trigger browser download of CSV content
 * @param csvContent CSV string content
 * @param filename Name of the file to download
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Ensure filename ends with .csv
  const csvFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;

  // Create blob with CSV content
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  // Create download link
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", csvFilename);
  link.style.visibility = "hidden";

  // Append to body, click, and cleanup
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Cleanup object URL
  URL.revokeObjectURL(url);
}

/**
 * Format currency value (in cents) for CSV export
 * @param cents Amount in cents
 * @returns Formatted currency string (e.g., "1234.56")
 */
export function formatCurrencyForCSV(cents: number): string {
  if (cents === null || cents === undefined || isNaN(cents)) {
    return "0.00";
  }
  const dollars = cents / 100;
  return dollars.toFixed(2);
}

/**
 * Format ISO date string for CSV export
 * @param isoDate ISO 8601 date string
 * @returns Formatted date string (YYYY-MM-DD HH:mm:ss)
 */
export function formatDateForCSV(isoDate: string): string {
  if (!isoDate) {
    return "";
  }

  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    return "";
  }
}

/**
 * Format percentage for CSV export
 * @param value Percentage value (e.g., 12.5)
 * @returns Formatted percentage string (e.g., "12.5%")
 */
export function formatPercentForCSV(value: number): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "0%";
  }
  return `${value}%`;
}

/**
 * Format boolean for CSV export
 * @param value Boolean value
 * @returns "Yes" or "No"
 */
export function formatBooleanForCSV(value: boolean): string {
  return value ? "Yes" : "No";
}

/**
 * Export data to CSV and trigger download
 * @param data Array of data objects
 * @param columns Column configuration
 * @param filename Name of the file to download
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  const csvContent = arrayToCSV(data, columns);
  downloadCSV(csvContent, filename);
}
