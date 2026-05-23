"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
 title: string;
 subtitle?: string;
 accentColor?: "blue" | "purple" | "green";
 id?: string;
 centered?: boolean;
}

export const SectionHeader = ({
 title,
 subtitle,
 accentColor = "blue",
 id,
 centered = true,
}: SectionHeaderProps) => {
 const gradients = {
 blue: "from-blue-500 via-blue-400 to-cyan-400",
 purple: "from-purple-500 via-purple-400 to-pink-400",
 green: "from-green-500 via-emerald-400 to-teal-400",
 };

 const glowColors = {
 blue: "bg-blue-500/20",
 purple: "bg-purple-500/20",
 green: "bg-[#12DFBA]/20",
 };

 return (
 <motion.div
 id={id}
 initial={{ opacity: 0, y: 20 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true, margin: "-50px" }}
 transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
 className={cn("relative scroll-mt-24", centered && "text-center")}
 >
 {/* Decorative glow behind */}
 <div
 className={cn(
 "absolute -inset-x-4 -inset-y-2 blur-3xl opacity-30 rounded-full",
 glowColors[accentColor]
 )}
 />

 {/* Decorative line elements */}
 <div className={cn("flex items-center gap-4 mb-4", centered && "justify-center")}>
 <motion.div
 initial={{ width: 0 }}
 whileInView={{ width: "3rem" }}
 viewport={{ once: true }}
 transition={{ duration: 0.6, delay: 0.2 }}
 className={cn(
 "h-px bg-gradient-to-r",
 gradients[accentColor],
 "opacity-60"
 )}
 />
 <div
 className={cn(
 "w-2 h-2 rounded-full bg-gradient-to-r",
 gradients[accentColor]
 )}
 />
 <motion.div
 initial={{ width: 0 }}
 whileInView={{ width: "3rem" }}
 viewport={{ once: true }}
 transition={{ duration: 0.6, delay: 0.2 }}
 className={cn(
 "h-px bg-gradient-to-l",
 gradients[accentColor],
 "opacity-60"
 )}
 />
 </div>

 {/* Title with gradient */}
 <h2
 className={cn(
 "relative text-2xl md:text-3xl font-bold",
 "bg-gradient-to-r bg-clip-text text-transparent",
 gradients[accentColor]
 )}
 >
 {title}
 </h2>

 {/* Subtitle */}
 {subtitle && (
 <motion.p
 initial={{ opacity: 0 }}
 whileInView={{ opacity: 1 }}
 viewport={{ once: true }}
 transition={{ duration: 0.5, delay: 0.3 }}
 className="mt-2 text-white/75 text-sm md:text-base"
 >
 {subtitle}
 </motion.p>
 )}
 </motion.div>
 );
};
