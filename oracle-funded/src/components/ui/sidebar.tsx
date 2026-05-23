"use client";

import { cn } from "@/lib/utils";
import Link, { LinkProps } from "next/link";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";

// Motion presets from DESIGN.md — inlined here to avoid creating
// new module files. Keep in sync with the four named springs.
const SPRING_GENTLE = { type: "spring" as const, stiffness: 150, damping: 20 };
const SPRING_SNAPPY = { type: "spring" as const, stiffness: 500, damping: 35 };
const EASE_OUT: [number, number, number, number] = [0, 0, 0.2, 1];
const EASE_DEFAULT: [number, number, number, number] = [0.4, 0, 0.2, 1];

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(true);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate: animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, animate } = useSidebar();
  return (
    // Sidebar uses canvas (bg) + line border, no drop shadow.
    // Collapse animation is width-only (DESIGN.md exception) at
    // 300ms ease-out; icons stay anchored, no scale/rotate.
    <motion.div
      className={cn(
        "h-full py-4 hidden md:flex md:flex-col bg-[#0C0319] flex-shrink-0 border-r border-white/10 relative",
        className
      )}
      animate={{
        width: animate ? (open ? "280px" : "80px") : "280px",
      }}
      transition={{
        duration: 0.3,
        ease: EASE_OUT,
      }}
      style={{
        paddingLeft: open ? 16 : 8,
        paddingRight: open ? 16 : 8,
        transitionProperty: "padding",
        transitionDuration: "300ms",
        transitionTimingFunction: "cubic-bezier(0, 0, 0.2, 1)",
      }}
      {...props}
    >
      {children as React.ReactNode}
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      {/* Mobile top bar with hamburger */}
      <div
        className={cn(
          "h-12 px-4 flex flex-row md:hidden items-center bg-[#0C0319] w-full border-b border-white/10"
        )}
        {...props}
      >
        <button
          className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors duration-150"
          style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
          onClick={() => setOpen(!open)}
        >
          <Bars3Icon className="text-white/85 w-5 h-5" />
        </button>
      </div>

      {/* Overlay + slide-in drawer. Drawer is a Level-3 surface so a
          drop shadow is acceptable per DESIGN.md (modals/popovers only). */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE_DEFAULT }}
              className="fixed inset-0 bg-black/60 z-[99] md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={SPRING_GENTLE}
              className={cn(
                "fixed h-full w-72 inset-y-0 left-0 bg-[#0C0319] p-6 z-[100] flex flex-col justify-between md:hidden",
                "shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]",
                className
              )}
            >
              <button
                className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors duration-150 text-white/85"
                style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
                onClick={() => setOpen(false)}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
  props?: LinkProps;
}) => {
  const { open, setOpen, animate } = useSidebar();
  const pathname = usePathname();

  // Active when pathname matches exactly OR is a nested route. Dashboard
  // root ("/dashboard") must only match its own page so we don't paint
  // every nested route as active.
  const isActive =
    pathname === link.href ||
    (link.href !== "/dashboard" && pathname?.startsWith(link.href + "/"));

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      transition={SPRING_SNAPPY}
      className={cn(
        "relative",
        !open && "mx-auto"
      )}
    >
      <Link
        href={link.href}
        onClick={() => {
          // Only close sidebar on mobile (md breakpoint = 768px)
          if (typeof window !== "undefined" && window.innerWidth < 768) {
            setOpen(false);
          }
        }}
        className={cn(
          "flex items-center group/sidebar rounded-lg relative",
          // Hover paint: ascend bg to white/6, 150ms ease-default
          "hover:bg-white/[0.06] transition-colors duration-150",
          // Open: full-width row with gap, padding
          open && "gap-3 justify-start px-3 py-2.5 w-full h-10",
          open && isActive && "bg-white/[0.06]",
          // Closed: fixed square so hover/active highlight is centered
          !open && "h-10 w-10 justify-center",
          !open && isActive && "bg-white/[0.06]",
          className
        )}
        style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
        {...props}
      >
        {/* Active-link accent: 3px primary bar on the left edge, animated
            between active links with layoutId. Hidden when collapsed and
            in mobile drawer, since the row centers in those modes. */}
        {open && isActive && (
          <motion.span
            layoutId="sidebar-active-accent"
            className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-[#7F24FF]"
            transition={SPRING_GENTLE}
          />
        )}

        <div
          className={cn(
            "h-5 w-5 flex-shrink-0 transition-colors duration-150",
            isActive
              ? "text-[#A769FF]"
              : "text-white/70 group-hover/sidebar:text-white"
          )}
          style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
        >
          {link.icon}
        </div>

        <motion.span
          animate={{
            opacity: animate ? (open ? 1 : 0) : 1,
            width: animate ? (open ? "auto" : 0) : "auto",
          }}
          transition={{
            duration: 0.3,
            ease: EASE_OUT,
          }}
          className={cn(
            "text-sm font-medium whitespace-pre !p-0 !m-0 overflow-hidden transition-colors duration-150",
            isActive ? "text-white" : "text-white/75 group-hover/sidebar:text-white"
          )}
          style={{ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
        >
          {link.label}
        </motion.span>
      </Link>
    </motion.div>
  );
};
