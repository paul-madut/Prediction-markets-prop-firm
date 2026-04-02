"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, motion } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  format?: (value: number) => string;
}

export function AnimatedNumber({
  value,
  className,
  format = (v) => v.toLocaleString(),
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    stiffness: 80,
    damping: 20,
  });

  useEffect(() => {
    motionValue.set(value);
  }, [motionValue, value]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = format(Math.round(latest));
      }
    });
    return unsubscribe;
  }, [springValue, format]);

  return <motion.span ref={ref} className={className} />;
}
