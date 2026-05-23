"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUpIcon, QueueListIcon } from "@heroicons/react/16/solid";
import { cn } from "@/lib/utils";

// Blueberry SectionNav (DESIGN.md):
// - Sticky on desktop (XL+), right column.
// - Active link gets a 2px #7F24FF left-edge bar that animates between
//   items via Framer `layoutId`.
// - Mobile uses a floating button that opens a compact list panel.

const GENTLE = { type: "spring" as const, stiffness: 150, damping: 20 };
const SNAPPY = { type: "spring" as const, stiffness: 500, damping: 35 };

interface Section {
  id: string;
  label: string;
}

interface SectionNavProps {
  sections: Section[];
}

export const SectionNav = ({ sections }: SectionNavProps) => {
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id ?? "");
  const [isVisible, setIsVisible] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);

      const current = sections
        .map((s) => ({ id: s.id, el: document.getElementById(s.id) }))
        .find(({ el }) => {
          if (!el) return false;
          const r = el.getBoundingClientRect();
          return r.top <= 150 && r.bottom > 150;
        });
      if (current) setActiveSection(current.id);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setIsMobileOpen(false);
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Desktop — fixed right-side panel */}
          <motion.nav
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="hidden xl:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col"
          >
            <div className="bg-[#180630] border border-white/10 rounded-xl p-2 min-w-[200px]">
              <div className="relative">
                {sections.map((section) => {
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={cn(
                        "group relative flex items-center w-full pl-4 pr-3 py-2 rounded-md transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
                        isActive
                          ? "text-white bg-white/[0.06]"
                          : "text-white/55 hover:text-white hover:bg-white/[0.03]",
                      )}
                    >
                      {/* Animated 2px left-edge bar — moves with layoutId */}
                      {isActive && (
                        <motion.span
                          layoutId="bb-section-nav-bar"
                          aria-hidden
                          className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-[#7F24FF]"
                          transition={GENTLE}
                        />
                      )}
                      <span className="text-sm font-medium whitespace-nowrap">
                        {section.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="h-px bg-white/10 my-2" />

              <button
                onClick={scrollToTop}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-white/55 hover:text-white hover:bg-white/[0.03] transition-colors duration-150"
              >
                <ChevronUpIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Back to top</span>
              </button>
            </div>
          </motion.nav>

          {/* Mobile — floating button + panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={SNAPPY}
            className="xl:hidden fixed bottom-6 right-6 z-40"
          >
            <AnimatePresence>
              {isMobileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={GENTLE}
                  className="absolute bottom-16 right-0 bg-[#1f0a3d] border border-white/[0.18] rounded-xl p-2 min-w-[200px] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]"
                >
                  <div className="relative">
                    {sections.map((section) => {
                      const isActive = activeSection === section.id;
                      return (
                        <button
                          key={section.id}
                          onClick={() => scrollToSection(section.id)}
                          className={cn(
                            "relative flex items-center w-full pl-4 pr-3 py-2 rounded-md transition-colors duration-150",
                            isActive
                              ? "text-white bg-white/[0.06]"
                              : "text-white/55 hover:text-white hover:bg-white/[0.03]",
                          )}
                        >
                          {isActive && (
                            <motion.span
                              layoutId="bb-section-nav-bar-mobile"
                              aria-hidden
                              className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-[#7F24FF]"
                              transition={GENTLE}
                            />
                          )}
                          <span className="text-sm font-medium">
                            {section.label}
                          </span>
                        </button>
                      );
                    })}

                    <div className="h-px bg-white/10 my-2" />

                    <button
                      onClick={scrollToTop}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-white/55 hover:text-white hover:bg-white/[0.03] transition-colors duration-150"
                    >
                      <ChevronUpIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">Back to top</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              whileTap={{ scale: 0.97 }}
              transition={SNAPPY}
              className={cn(
                "w-12 h-12 rounded-full inline-flex items-center justify-center border transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
                isMobileOpen
                  ? "bg-[#7F24FF] border-[#7F24FF] text-white"
                  : "bg-[#180630] border-white/10 text-white/55 hover:text-white hover:bg-[#1f0a3d]",
              )}
            >
              <QueueListIcon className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
