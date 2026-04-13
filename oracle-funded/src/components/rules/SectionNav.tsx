"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronUpIcon, QueueListIcon } from "@heroicons/react/16/solid";

interface Section {
  id: string;
  label: string;
}

interface SectionNavProps {
  sections: Section[];
}

export const SectionNav = ({ sections }: SectionNavProps) => {
  const [activeSection, setActiveSection] = useState<string>("");
  const [isVisible, setIsVisible] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show nav after scrolling 300px
      setIsVisible(window.scrollY > 300);

      // Determine active section
      const sectionElements = sections.map((s) => ({
        id: s.id,
        element: document.getElementById(s.id),
      }));

      const currentSection = sectionElements.find((s) => {
        if (!s.element) return false;
        const rect = s.element.getBoundingClientRect();
        return rect.top <= 150 && rect.bottom > 150;
      });

      if (currentSection) {
        setActiveSection(currentSection.id);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setIsMobileOpen(false);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Desktop Navigation - Fixed on right side */}
          <motion.nav
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="hidden xl:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col gap-2"
          >
            <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 rounded-xl p-2 shadow-xl">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    "group flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all duration-200",
                    activeSection === section.id
                      ? "bg-blue-500/20 text-blue-400"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-200",
                      activeSection === section.id
                        ? "bg-blue-500"
                        : "bg-gray-600 group-hover:bg-gray-400"
                    )}
                  />
                  <span className="text-sm font-medium whitespace-nowrap">
                    {section.label}
                  </span>
                </button>
              ))}

              {/* Divider */}
              <div className="h-px bg-gray-700/50 my-2" />

              {/* Back to top */}
              <button
                onClick={scrollToTop}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-all duration-200"
              >
                <ChevronUpIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Back to top</span>
              </button>
            </div>
          </motion.nav>

          {/* Mobile Navigation - Floating button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="xl:hidden fixed bottom-6 right-6 z-40"
          >
            <AnimatePresence>
              {isMobileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-16 right-0 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-xl p-2 shadow-xl min-w-[180px]"
                >
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all duration-200 text-left",
                        activeSection === section.id
                          ? "bg-blue-500/20 text-blue-400"
                          : "text-gray-400 hover:bg-gray-800 hover:text-white"
                      )}
                    >
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          activeSection === section.id
                            ? "bg-blue-500"
                            : "bg-gray-600"
                        )}
                      />
                      <span className="text-sm font-medium">{section.label}</span>
                    </button>
                  ))}

                  <div className="h-px bg-gray-700/50 my-2" />

                  <button
                    onClick={scrollToTop}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-all duration-200"
                  >
                    <ChevronUpIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">Back to top</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300",
                isMobileOpen
                  ? "bg-blue-500 text-white"
                  : "bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 text-gray-400 hover:text-white"
              )}
            >
              <QueueListIcon className="w-5 h-5" />
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
