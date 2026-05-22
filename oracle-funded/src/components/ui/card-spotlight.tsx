"use client";

import React, { useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardSpotlightProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
  spotlightSize?: number;
  borderColor?: string;
  gradientOpacity?: number;
  variant?: "dark" | "light";
}

export const CardSpotlight = ({
  children,
  className,
  color = "rgba(127, 36, 255, 0.22)", // Blueberry purple, low opacity
  spotlightSize = 250,
  borderColor = "rgba(167, 105, 255, 0.5)", // accent purple
  gradientOpacity = 0.8,
  variant = "dark",
}: CardSpotlightProps) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring animation config for smooth following
  const springConfig = { damping: 30, stiffness: 300 };
  const spotlightX = useSpring(mouseX, springConfig);
  const spotlightY = useSpring(mouseY, springConfig);

  // Transform opacity based on hover state
  const opacity = useTransform(
    useMotionValue(isHovered ? 1 : 0),
    [0, 1],
    [0, gradientOpacity]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;

    const rect = divRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mouseX.set(x);
    mouseY.set(y);
  }, [mouseX, mouseY]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group relative rounded-xl border p-6 overflow-hidden transition-all duration-300",
        variant === "dark"
          ? "border-gray-700/20 bg-gradient-to-br from-gray-900 to-gray-800 hover:border-gray-600/40 hover:shadow-2xl hover:shadow-blue-500/10"
          : "border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-gray-300 hover:shadow-xl hover:shadow-gray-200/50",
        className
      )}
    >
      {/* Animated spotlight effect */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(${spotlightSize}px circle at var(--mouse-x) var(--mouse-y), ${color}, transparent 80%)`,
          // @ts-ignore - CSS variables
          "--mouse-x": `${spotlightX.get()}px`,
          "--mouse-y": `${spotlightY.get()}px`,
        }}
      />

      {/* Dynamic glow border effect */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(${spotlightSize * 0.8}px circle at var(--mouse-x) var(--mouse-y), ${borderColor}, transparent 70%)`,
          // @ts-ignore - CSS variables
          "--mouse-x": `${spotlightX.get()}px`,
          "--mouse-y": `${spotlightY.get()}px`,
          mixBlendMode: "overlay",
        }}
      />

      {/* Subtle noise texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content with elevated z-index */}
      <div className="relative z-10">{children}</div>

      {/* Corner accents */}
      <div className={cn(
        "pointer-events-none absolute top-0 left-0 h-px w-20 bg-gradient-to-r to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100",
        variant === "dark" ? "from-blue-500/50" : "from-blue-500/30"
      )} />
      <div className={cn(
        "pointer-events-none absolute top-0 left-0 w-px h-20 bg-gradient-to-b to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100",
        variant === "dark" ? "from-blue-500/50" : "from-blue-500/30"
      )} />
      <div className={cn(
        "pointer-events-none absolute bottom-0 right-0 h-px w-20 bg-gradient-to-l to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100",
        variant === "dark" ? "from-blue-500/50" : "from-blue-500/30"
      )} />
      <div className={cn(
        "pointer-events-none absolute bottom-0 right-0 w-px h-20 bg-gradient-to-t to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100",
        variant === "dark" ? "from-blue-500/50" : "from-blue-500/30"
      )} />
    </div>
  );
};
