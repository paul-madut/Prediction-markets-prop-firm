"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import { cn } from "@/lib/utils";

// Blueberry FAQ accordion (DESIGN.md):
// - Question row is 56px tall, hover paints bg-white/[0.03].
// - Chevron rotates 0 -> 180deg on open with a `snappy` spring.
// - Panel uses Framer's `layout` + `gentle` spring for height. The accordion
//   panel is the documented exception to "no animated height".

const SNAPPY = { type: "spring" as const, stiffness: 500, damping: 35 };
const GENTLE = { type: "spring" as const, stiffness: 150, damping: 20 };

interface FAQItem {
  q: string;
  a: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export const FAQAccordion = ({ items }: FAQAccordionProps) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-2">
      {items.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{
              duration: 0.3,
              delay: Math.min(index, 8) * 0.03,
              ease: [0.4, 0, 0.2, 1],
            }}
            className={cn(
              "rounded-xl border bg-[#180630] overflow-hidden",
              "transition-[border-color] duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
              isOpen ? "border-white/[0.18]" : "border-white/10",
            )}
          >
            <button
              onClick={() => toggleItem(index)}
              className="w-full h-14 px-5 flex items-center justify-between gap-4 text-left hover:bg-white/[0.03] transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]"
              aria-expanded={isOpen}
            >
              <span className="text-[15px] font-semibold text-white">
                {faq.q}
              </span>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={SNAPPY}
                className={cn(
                  "inline-flex items-center justify-center w-7 h-7 rounded-md shrink-0",
                  isOpen
                    ? "bg-[#7F24FF]/15 text-[#A769FF]"
                    : "bg-white/[0.06] text-white/55",
                )}
              >
                <ChevronDownIcon className="w-4 h-4" />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  layout
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    height: GENTLE,
                    opacity: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
                  }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="px-5 pb-5">
                    <div className="pt-3 border-t border-white/10">
                      <p className="text-sm text-white/75 pt-3 leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
};
