"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface NoiseBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  gradientColors?: string[];
  noiseIntensity?: number;
  speed?: number;
}

export const NoiseBackground = ({
  children,
  className,
  containerClassName,
  gradientColors = ["rgb(37, 99, 235)", "rgb(59, 130, 246)"], // blue-600 to blue-500
  noiseIntensity = 0.15,
  speed = 0.05,
}: NoiseBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    // Set canvas size with device pixel ratio for crisp rendering
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Pre-generate noise texture for better performance
    const noiseCanvas = document.createElement("canvas");
    const noiseCtx = noiseCanvas.getContext("2d");

    const generateNoiseTexture = () => {
      if (!noiseCtx) return null;

      const size = 128; // Small texture that will be tiled
      noiseCanvas.width = size;
      noiseCanvas.height = size;

      const imageData = noiseCtx.createImageData(size, size);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const value = Math.random() * 255 * noiseIntensity;
        data[i] = value;       // Red
        data[i + 1] = value;   // Green
        data[i + 2] = value;   // Blue
        data[i + 3] = 255;     // Alpha
      }

      noiseCtx.putImageData(imageData, 0, 0);
      return noiseCanvas;
    };

    const noiseTexture = generateNoiseTexture();

    // Animation loop with time-based noise regeneration
    const animate = () => {
      time += speed;

      const rect = canvas.getBoundingClientRect();

      // Draw gradient background
      const gradient = ctx.createLinearGradient(
        0,
        0,
        rect.width,
        rect.height
      );

      // Add animated color stops
      const colorOffset = Math.sin(time * 0.5) * 0.1;
      gradient.addColorStop(0, gradientColors[0]);
      gradient.addColorStop(0.5 + colorOffset, gradientColors[1] || gradientColors[0]);
      gradient.addColorStop(1, gradientColors[0]);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Apply noise overlay with pattern
      if (noiseTexture) {
        ctx.globalCompositeOperation = "overlay";
        ctx.globalAlpha = 0.4 + Math.sin(time) * 0.1; // Subtle pulsing effect

        // Tile the noise texture
        const pattern = ctx.createPattern(noiseTexture, "repeat");
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, rect.width, rect.height);
        }

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [gradientColors, noiseIntensity, speed]);

  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 w-full h-full pointer-events-none",
          className
        )}
      />
      {children && (
        <div className="relative z-10">{children}</div>
      )}
    </div>
  );
};
