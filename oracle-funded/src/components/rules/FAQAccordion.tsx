"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import { cn } from "@/lib/utils";

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
    <div className="space-y-3">
      {items.map((faq, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{
            duration: 0.4,
            delay: index * 0.1,
            ease: [0.21, 0.47, 0.32, 0.98],
          }}
        >
          <div
            className={cn(
              "rounded-xl border overflow-hidden transition-all duration-300",
              "bg-white",
              openIndex === index
                ? "border-blue-500/40 shadow-lg shadow-blue-100"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <button
              onClick={() => toggleItem(index)}
              className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left"
            >
              <span className="font-semibold text-gray-900">{faq.q}</span>
              <motion.div
                animate={{ rotate: openIndex === index ? 180 : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className={cn(
                  "flex-shrink-0 p-1 rounded-full transition-colors duration-300",
                  openIndex === index
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-500"
                )}
              >
                <ChevronDownIcon className="w-5 h-5" />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {openIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    height: { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] },
                    opacity: { duration: 0.25, delay: 0.05 },
                  }}
                >
                  <div className="px-6 pb-5">
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-gray-600 pt-4 leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
