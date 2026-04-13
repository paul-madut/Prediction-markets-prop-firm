"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, PlusIcon, MinusIcon, ArrowPathIcon, ArrowDownTrayIcon, ChevronLeftIcon, ChevronRightIcon, ArrowsPointingOutIcon, PhotoIcon } from "@heroicons/react/16/solid";
import { KYCDocument } from "@/types/admin";
import { cn } from "@/lib/utils";

interface DocumentViewerProps {
  documents: KYCDocument[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentViewer({
  documents,
  initialIndex = 0,
  isOpen,
  onClose,
}: DocumentViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLDivElement>(null);

  const currentDoc = documents[currentIndex];

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    // Reset view when document changes
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          handlePrevious();
          break;
        case "ArrowRight":
          handleNext();
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
        case "_":
          handleZoomOut();
          break;
        case "r":
        case "R":
          handleRotate();
          break;
        case "f":
        case "F":
          handleFit();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, zoom, rotation]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < documents.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleFit = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleDownload = () => {
    // In a real app, this would download the actual file
    const link = document.createElement("a");
    link.href = currentDoc.fileUrl;
    link.download = currentDoc.fileName;
    link.click();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      id_front: "ID - Front",
      id_back: "ID - Back",
      passport: "Passport",
      proof_of_address: "Proof of Address",
      selfie: "Selfie",
    };
    return labels[type] || type;
  };

  if (!currentDoc) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50"
          />

          {/* Viewer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col"
          >
            {/* Top Bar */}
            <div className="bg-black/50 backdrop-blur-sm border-b border-white/10">
              <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                  <div className="h-8 w-px bg-white/20" />
                  <div>
                    <h3 className="text-white font-medium">
                      {getDocumentTypeLabel(currentDoc.type)}
                    </h3>
                    <p className="text-sm text-white/60">{currentDoc.fileName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Zoom Controls */}
                  <button
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.5}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MinusIcon className="h-5 w-5" />
                  </button>
                  <span className="text-white text-sm font-medium min-w-[60px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>

                  <div className="h-8 w-px bg-white/20 mx-2" />

                  {/* Rotate */}
                  <button
                    onClick={handleRotate}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                    title="Rotate 90°"
                  >
                    <ArrowPathIcon className="h-5 w-5" />
                  </button>

                  {/* Fit to Screen */}
                  <button
                    onClick={handleFit}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                    title="Fit to screen (F)"
                  >
                    <ArrowsPointingOutIcon className="h-5 w-5" />
                  </button>

                  <div className="h-8 w-px bg-white/20 mx-2" />

                  {/* Download */}
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    ArrowDownTrayIcon
                  </button>
                </div>
              </div>
            </div>

            {/* Main Viewer */}
            <div className="flex-1 relative overflow-hidden">
              {/* Document Navigation */}
              {documents.length > 1 && (
                <>
                  <button
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors text-white disabled:opacity-30 disabled:cursor-not-allowed z-10"
                  >
                    <ChevronLeftIcon className="h-6 w-6" />
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={currentIndex === documents.length - 1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-colors text-white disabled:opacity-30 disabled:cursor-not-allowed z-10"
                  >
                    <ChevronRightIcon className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Image Container */}
              <div
                ref={imageRef}
                className={cn(
                  "h-full flex items-center justify-center",
                  zoom > 1 && "cursor-move"
                )}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <motion.div
                  animate={{
                    scale: zoom,
                    rotate: rotation,
                    x: position.x,
                    y: position.y,
                  }}
                  transition={{ type: "tween", duration: 0.2 }}
                  className="relative"
                  style={{ transformOrigin: "center" }}
                >
                  {/* Placeholder for document image */}
                  <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
                    <div className="aspect-[3/4] w-[600px] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <div className="text-center">
                        <PhotoIcon className="h-24 w-24 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">
                          {getDocumentTypeLabel(currentDoc.type)}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          Document preview would appear here
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Document Counter */}
              {documents.length > 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm">
                  {currentIndex + 1} / {documents.length}
                </div>
              )}
            </div>

            {/* Metadata Sidebar */}
            <motion.div
              initial={{ x: 300 }}
              animate={{ x: 0 }}
              exit={{ x: 300 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-black/50 backdrop-blur-sm border-l border-white/10 p-6 overflow-y-auto"
            >
              <h3 className="text-white font-semibold mb-4">Document Information</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-white/60 mb-1">Type</p>
                  <p className="text-white">{getDocumentTypeLabel(currentDoc.type)}</p>
                </div>
                <div>
                  <p className="text-sm text-white/60 mb-1">File Name</p>
                  <p className="text-white text-sm break-all">{currentDoc.fileName}</p>
                </div>
                <div>
                  <p className="text-sm text-white/60 mb-1">Uploaded</p>
                  <p className="text-white">{new Date(currentDoc.uploadedAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-white/60 mb-1">Status</p>
                  <span
                    className={cn(
                      "inline-flex px-2 py-1 text-xs font-medium rounded-full",
                      currentDoc.verified
                        ? "bg-green-500/20 text-green-400"
                        : "bg-amber-500/20 text-amber-400"
                    )}
                  >
                    {currentDoc.verified ? "Verified" : "Pending Verification"}
                  </span>
                </div>

                {/* Keyboard Shortcuts */}
                <div className="pt-4 border-t border-white/10 mt-6">
                  <p className="text-sm text-white/60 mb-3">Keyboard Shortcuts</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Navigate</span>
                      <span className="text-white font-mono">← →</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Zoom In/Out</span>
                      <span className="text-white font-mono">+ / -</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Rotate</span>
                      <span className="text-white font-mono">R</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Fit to Screen</span>
                      <span className="text-white font-mono">F</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Close</span>
                      <span className="text-white font-mono">ESC</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
