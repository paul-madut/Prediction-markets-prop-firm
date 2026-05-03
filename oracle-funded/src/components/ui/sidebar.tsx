"use client";

import { cn } from "@/lib/utils";
import Link, { LinkProps } from "next/link";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";

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
    <motion.div
      className={cn(
        "h-full py-4 hidden md:flex md:flex-col bg-white dark:bg-slate-900 flex-shrink-0 border-r border-gray-200 dark:border-slate-800 relative",
        className
      )}
      animate={{
        width: animate ? (open ? "300px" : "70px") : "300px",
        paddingLeft: open ? "16px" : "8px",
        paddingRight: open ? "16px" : "8px",
      }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
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
          "h-12 px-4 flex flex-row md:hidden items-center bg-white dark:bg-slate-900 w-full border-b border-gray-200 dark:border-slate-800"
        )}
        {...props}
      >
        <button
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          onClick={() => setOpen(!open)}
        >
          <Bars3Icon className="text-neutral-800 w-5 h-5" />
        </button>
      </div>

      {/* Overlay + slide-in drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 z-[99] md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={cn(
                "fixed h-full w-72 inset-y-0 left-0 bg-white dark:bg-slate-900 p-6 z-[100] flex flex-col justify-between shadow-xl md:hidden",
                className
              )}
            >
              <button
                className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-neutral-800"
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

  // Check if this is the current page
  const isActive = pathname === link.href;

  return (
    <Link
      href={link.href}
      onClick={() => {
        // Only close sidebar on mobile (md breakpoint = 768px)
        if (window.innerWidth < 768) {
          setOpen(false);
        }
      }}
      className={cn(
        "flex items-center group/sidebar rounded-lg relative",
        "hover:bg-gray-100 dark:hover:bg-slate-800",
        // Open: full-width row with gap, padding, optional active border
        open && "gap-3 justify-start px-3 py-3 w-full",
        open && isActive && "bg-blue-50 border-l-4 border-blue-600",
        open && !isActive && "border-l-4 border-transparent",
        // Closed: fixed square so hover/active highlight is centered
        !open && "h-10 w-10 mx-auto justify-center",
        !open && isActive && "bg-blue-50",
        className
      )}
      {...props}
    >
      <motion.div
        className={cn(
          "h-5 w-5 flex-shrink-0",
          isActive ? "text-blue-600" : "text-neutral-700 dark:text-gray-300 group-hover/sidebar:text-blue-600"
        )}
        transition={{ duration: 0.2 }}
      >
        {link.icon}
      </motion.div>

      <motion.span
        animate={{
          opacity: animate ? (open ? 1 : 0) : 1,
          width: animate ? (open ? "auto" : 0) : "auto",
        }}
        transition={{
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1],
        }}
        className={cn(
          "text-base font-medium whitespace-pre !p-0 !m-0 overflow-hidden",
          isActive ? "text-blue-600" : "text-neutral-700 dark:text-gray-300 group-hover/sidebar:text-blue-600"
        )}
      >
        {link.label}
      </motion.span>
    </Link>
  );
};
