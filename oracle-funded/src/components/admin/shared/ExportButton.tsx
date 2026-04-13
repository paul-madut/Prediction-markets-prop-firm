"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownTrayIcon, DocumentArrowDownIcon, CheckIcon } from "@heroicons/react/16/solid";
import { ExportColumn, exportToCSV } from "@/lib/csvExport";
import { cn } from "@/lib/utils";

interface ExportButtonProps<T = any> {
  data: T[];
  filename: string;
  columns: ExportColumn<T>[];
  selectedIds?: Set<string>;
  entityIdKey?: string;
  label?: string;
  className?: string;
}

export default function ExportButton<T extends Record<string, any>>({
  data,
  filename,
  columns,
  selectedIds,
  entityIdKey = "id",
  label = "Export",
  className,
}: ExportButtonProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleExport = async (type: "visible" | "selected" | "all") => {
    setIsExporting(true);
    setIsOpen(false);

    // Simulate processing time for UX
    await new Promise((resolve) => setTimeout(resolve, 500));

    let dataToExport: T[] = [];
    let filenameSuffix = "";

    switch (type) {
      case "visible":
        dataToExport = data;
        filenameSuffix = "visible";
        break;
      case "selected":
        if (selectedIds && selectedIds.size > 0) {
          dataToExport = data.filter((item) => selectedIds.has(String(item[entityIdKey])));
          filenameSuffix = "selected";
        } else {
          dataToExport = data;
          filenameSuffix = "visible";
        }
        break;
      case "all":
        dataToExport = data;
        filenameSuffix = "all";
        break;
    }

    // Generate timestamp for filename
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const finalFilename = `${filename}_${filenameSuffix}_${timestamp}`;

    exportToCSV(dataToExport, columns, finalFilename);

    setIsExporting(false);
    setExportComplete(true);

    // Reset complete state after animation
    setTimeout(() => {
      setExportComplete(false);
    }, 2000);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting || data.length === 0}
        className={cn(
          "flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        {isExporting ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <ArrowDownTrayIcon className="h-4 w-4 text-gray-600" />
            </motion.div>
            <span className="text-sm font-medium text-gray-700">Exporting...</span>
          </>
        ) : exportComplete ? (
          <>
            <CheckIcon className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-600">Exported!</span>
          </>
        ) : (
          <>
            <ArrowDownTrayIcon className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
          >
            {/* Export Visible Rows */}
            <button
              onClick={() => handleExport("visible")}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
            >
              <DocumentArrowDownIcon className="h-4 w-4 text-gray-500" />
              <div>
                <div className="font-medium">Export Visible Rows</div>
                <div className="text-xs text-gray-500">{data.length} rows</div>
              </div>
            </button>

            {/* Export Selected (if applicable) */}
            {selectedIds && selectedIds.size > 0 && (
              <>
                <div className="h-px bg-gray-200 my-1" />
                <button
                  onClick={() => handleExport("selected")}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 text-indigo-600" />
                  <div>
                    <div className="font-medium">Export Selected</div>
                    <div className="text-xs text-gray-500">{selectedIds.size} rows</div>
                  </div>
                </button>
              </>
            )}

            {/* Export All */}
            <div className="h-px bg-gray-200 my-1" />
            <button
              onClick={() => handleExport("all")}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
            >
              <DocumentArrowDownIcon className="h-4 w-4 text-gray-500" />
              <div>
                <div className="font-medium">Export All</div>
                <div className="text-xs text-gray-500">Full dataset</div>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
