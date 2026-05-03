"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BrandConfig, ThemeMode, mockAdminFirm } from "@/data/mockAdminFirm";

const STORAGE_KEY = "webflux:firm:branding";

interface FirmBrandingContextValue {
  brand: BrandConfig;
  firmName: string;
  setBrand: (updates: Partial<BrandConfig>) => void;
  setFirmName: (name: string) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  resetToDefaults: () => void;
}

const defaultBrand: BrandConfig = {
  ...mockAdminFirm.brandConfig,
};
const defaultFirmName = mockAdminFirm.name;

const FirmBrandingContext = createContext<FirmBrandingContextValue | undefined>(
  undefined
);

interface PersistedShape {
  brand: BrandConfig;
  firmName: string;
}

function readStorage(): PersistedShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedShape>;
    if (!parsed.brand) return null;
    // Merge with defaults so new fields don't break older saved blobs
    return {
      brand: { ...defaultBrand, ...parsed.brand },
      firmName: parsed.firmName ?? defaultFirmName,
    };
  } catch {
    return null;
  }
}

function applyCssVars(brand: BrandConfig) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", brand.primaryColor);
  root.style.setProperty("--brand-secondary", brand.secondaryColor);
  root.style.setProperty("--brand-accent", brand.accentColor);
  if (brand.theme === "dark") {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
}

export function FirmBrandingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [brand, setBrandState] = useState<BrandConfig>(defaultBrand);
  const [firmName, setFirmNameState] = useState<string>(defaultFirmName);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const persisted = readStorage();
    if (persisted) {
      setBrandState(persisted.brand);
      setFirmNameState(persisted.firmName);
    }
    setHydrated(true);
  }, []);

  // Apply to DOM whenever brand changes (also covers initial hydration)
  useEffect(() => {
    applyCssVars(brand);
  }, [brand]);

  // Persist whenever state changes (skip until hydrated to avoid clobbering)
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ brand, firmName } satisfies PersistedShape)
      );
    } catch {
      // ignore
    }
  }, [brand, firmName, hydrated]);

  const setBrand = useCallback((updates: Partial<BrandConfig>) => {
    setBrandState((prev) => ({ ...prev, ...updates }));
  }, []);

  const setFirmName = useCallback((name: string) => {
    setFirmNameState(name);
  }, []);

  const setTheme = useCallback((theme: ThemeMode) => {
    setBrandState((prev) => ({ ...prev, theme }));
  }, []);

  const toggleTheme = useCallback(() => {
    setBrandState((prev) => ({
      ...prev,
      theme: prev.theme === "light" ? "dark" : "light",
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setBrandState(defaultBrand);
    setFirmNameState(defaultFirmName);
  }, []);

  const value = useMemo<FirmBrandingContextValue>(
    () => ({
      brand,
      firmName,
      setBrand,
      setFirmName,
      setTheme,
      toggleTheme,
      resetToDefaults,
    }),
    [brand, firmName, setBrand, setFirmName, setTheme, toggleTheme, resetToDefaults]
  );

  return (
    <FirmBrandingContext.Provider value={value}>
      {children}
    </FirmBrandingContext.Provider>
  );
}

export function useFirmBranding(): FirmBrandingContextValue {
  const ctx = useContext(FirmBrandingContext);
  if (!ctx) {
    throw new Error("useFirmBranding must be used within FirmBrandingProvider");
  }
  return ctx;
}
