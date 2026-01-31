import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const textureButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 rounded-lg",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-md border border-blue-600/50 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg focus-visible:ring-blue-500",
        accent:
          "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-md border border-indigo-600/50 hover:from-indigo-600 hover:to-indigo-700 hover:shadow-lg focus-visible:ring-indigo-500",
        secondary:
          "bg-gradient-to-b from-white to-gray-50 text-gray-700 shadow-sm border border-gray-200 hover:from-gray-50 hover:to-gray-100 hover:shadow-md focus-visible:ring-gray-400",
        minimal:
          "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-400",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
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
