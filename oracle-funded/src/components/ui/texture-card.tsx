import * as React from "react";
import { cn } from "@/lib/utils";

// Blueberry-themed glass card. Dark, translucent, subtle purple inset glow.
const TextureCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }
>(({ className, interactive = true, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border border-white/10 bg-[#180630]/85 backdrop-blur-md shadow-[inset_0_-8px_12px_0_rgba(127,36,255,0.10)] transition-all duration-300 ease-out",
      interactive && "hover:border-[#A769FF]/35 hover:-translate-y-0.5 hover:shadow-[inset_0_-8px_12px_0_rgba(127,36,255,0.18),0_18px_38px_-12px_rgba(127,36,255,0.45)]",
      className,
    )}
    {...props}
  >
    <div className="rounded-[15px] border border-white/[0.05] transition-colors duration-300">
      <div className="rounded-[14px] border border-white/[0.03] transition-colors duration-300">
        {props.children}
      </div>
    </div>
  </div>
));
TextureCard.displayName = "TextureCard";

const TextureCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6 pb-0", className)}
    {...props}
  />
));
TextureCardHeader.displayName = "TextureCardHeader";

const TextureCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-white",
      className,
    )}
    style={{ fontFamily: "var(--font-heading)" }}
    {...props}
  />
));
TextureCardTitle.displayName = "TextureCardTitle";

const TextureCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6", className)} {...props} />
));
TextureCardContent.displayName = "TextureCardContent";

const TextureCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
TextureCardFooter.displayName = "TextureCardFooter";

const TextureSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "h-px bg-gradient-to-r from-transparent via-white/15 to-transparent mx-6",
      className,
    )}
    {...props}
  />
));
TextureSeparator.displayName = "TextureSeparator";

export {
  TextureCard,
  TextureCardHeader,
  TextureCardTitle,
  TextureCardContent,
  TextureCardFooter,
  TextureSeparator,
};
