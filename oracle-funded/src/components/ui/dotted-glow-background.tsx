"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface DottedGlowBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  color?: string;
  glowColor?: string;
  gap?: number;
  radius?: number;
  speedMin?: number;
  speedMax?: number;
}

export const DottedGlowBackground = ({
  children,
  className,
  color = "rgba(37, 99, 235, 0.3)", // blue-600 with opacity
  glowColor = "rgba(37, 99, 235, 0.8)",
  gap = 15,
  radius = 2.5,
  speedMin = 0.3,
  speedMax = 1.0,
}: DottedGlowBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationId: number;
    let dots: Array<{
      x: number;
      y: number;
      baseRadius: number;
      glowRadius: number;
      glowIntensity: number;
      glowSpeed: number;
      phase: number;
    }> = [];

    // Set canvas size with device pixel ratio
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      ctx.scale(dpr, dpr);

      // Regenerate dots on resize
      dots = [];
      for (let x = gap / 2; x < rect.width; x += gap) {
        for (let y = gap / 2; y < rect.height; y += gap) {
          dots.push({
            x,
            y,
            baseRadius: radius,
            glowRadius: 0,
            glowIntensity: Math.random() * Math.PI * 2, // Random starting phase
            glowSpeed: speedMin + Math.random() * (speedMax - speedMin),
            phase: Math.random() * Math.PI * 2, // Additional phase offset
          });
        }
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Animation loop with optimized rendering
    const animate = (timestamp: number) => {
      const rect = canvas.getBoundingClientRect();

      // Clear with slight fade for trail effect
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(0, 0, rect.width, rect.height);

      dots.forEach((dot, index) => {
        // Update glow with time-based animation
        dot.glowIntensity += dot.glowSpeed * 0.016;
        const glow = Math.sin(dot.glowIntensity + dot.phase) * 0.5 + 0.5;
        dot.glowRadius = radius + glow * radius * 2.5;

        // Draw glow with radial gradient (only when visible)
        if (glow > 0.25) {
          const glowSize = dot.glowRadius * 3;
          const gradient = ctx.createRadialGradient(
            dot.x,
            dot.y,
            0,
            dot.x,
            dot.y,
            glowSize
          );

          // Pulsing glow effect
          const alpha = glow * 0.8;
          const adjustedGlowColor = glowColor.replace(/[\d.]+\)$/, `${alpha})`);

          gradient.addColorStop(0, adjustedGlowColor);
          gradient.addColorStop(0.4, adjustedGlowColor.replace(/[\d.]+\)$/, `${alpha * 0.5})`));
          gradient.addColorStop(1, "transparent");

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, glowSize, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw base dot with slight shadow
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = radius * 0.5;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.baseRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [color, glowColor, gap, radius, speedMin, speedMax]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
};
