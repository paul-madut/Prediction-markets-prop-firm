import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const textureButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0C0319] disabled:pointer-events-none disabled:opacity-50 rounded-[10px]",
  {
    variants: {
      variant: {
        primary:
          "text-white shadow-[0_8px_24px_-6px_rgba(127,36,255,0.55)] hover:shadow-[0_12px_28px_-6px_rgba(127,36,255,0.7)] hover:-translate-y-px focus-visible:ring-[#7F24FF] bg-[#7F24FF] hover:bg-[#A769FF]",
        accent:
          "text-white shadow-[0_8px_24px_-6px_rgba(167,105,255,0.55)] hover:shadow-[0_12px_28px_-6px_rgba(167,105,255,0.7)] hover:-translate-y-px focus-visible:ring-[#A769FF] bg-[#A769FF] hover:bg-[#7F24FF]",
        secondary:
          "bg-white/[0.06] text-white border border-white/15 hover:bg-white/[0.10] hover:border-white/25 focus-visible:ring-white/30",
        minimal:
          "bg-transparent text-white/80 hover:bg-white/[0.06] hover:text-white focus-visible:ring-white/20",
        destructive:
          "text-white shadow-[0_8px_24px_-6px_rgba(255,28,28,0.5)] hover:shadow-[0_12px_28px_-6px_rgba(255,28,28,0.65)] hover:-translate-y-px focus-visible:ring-[#FF1C1C] bg-[#FF1C1C] hover:bg-[#d51111]",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-3.5 text-xs",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface TextureButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof textureButtonVariants> {
  asChild?: boolean;
}

const TextureButton = React.forwardRef<HTMLButtonElement, TextureButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(textureButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
TextureButton.displayName = "TextureButton";

export { TextureButton, textureButtonVariants };
