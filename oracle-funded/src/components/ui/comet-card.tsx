"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface CometCardProps {
  children: React.ReactNode;
  className?: string;
  rotateDepth?: number;
  translateDepth?: number;
}

export const CometCard = ({
  children,
  className,
  rotateDepth = 15,
  translateDepth = 15,
}: CometCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const xSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const ySpring = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(ySpring, [0, 1], [rotateDepth, -rotateDepth]);
  const rotateY = useTransform(xSpring, [0, 1], [-rotateDepth, rotateDepth]);
  const translateX = useTransform(xSpring, [0, 1], [-translateDepth, translateDepth]);
  const translateY = useTransform(ySpring, [0, 1], [-translateDepth, translateDepth]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPercent = mouseX / rect.width;
    const yPercent = mouseY / rect.height;

    x.set(xPercent);
    y.set(yPercent);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    x.set(0.5);
    y.set(0.5);
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      style={{ perspective: "1000px" }}
      className="relative"
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          x: isHovering ? translateX : 0,
          y: isHovering ? translateY : 0,
          transformStyle: "preserve-3d",
        }}
        transition={{ type: "spring", stiffness: 150, damping: 20 }}
        className={cn(
          "relative transition-shadow duration-300 will-change-transform",
          isHovering && "shadow-2xl",
          className
        )}
      >
        {/* Shine/glare effect */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
          style={{
            background: useTransform(
              [xSpring, ySpring],
              ([latestX, latestY]) =>
                `radial-gradient(circle at ${(latestX as number) * 100}% ${(latestY as number) * 100}%, rgba(255,255,255,0.15) 0%, transparent 50%)`
            ),
            opacity: isHovering ? 1 : 0,
          }}
        />
        {children}
      </motion.div>
    </div>
  );
};
