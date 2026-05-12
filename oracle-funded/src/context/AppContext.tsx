"use client";

// Lean app-level context — fetches the trader's authenticated state and their
// firm-scoped accounts on mount. Replaces the mock-data provider.
//
// What it intentionally does NOT do:
//   - Carry markets, trades, positions, equity history, challenge plans, or
//     any of the other domain shapes the old AppContext exposed. Pages that
//     need those fetch directly via api-client (e.g. /dashboard/markets hits
//     /api/markets, /dashboard/payouts hits /api/payouts).
//   - Provide trade execution helpers — orders go straight to /api/orders.
//
// Pages still importing `useApp()` get a small surface: { user, accounts,
// activeAccountId, setActiveAccount, refresh, loading, signedIn }. Mock
// pages have been replaced with StubPage; the few pages that need rich
// derived state read account fields directly.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "@/lib/api-client";

const ACTIVE_ACCOUNT_KEY = "oracle_active_account_id";

export interface FirmSettings {
  id: string;
  name: string;
  slug: string;
  status: string;
  oneSidedThresholdPct: number;
  enabledVenues: string[];
}

export interface UserProfile {
  fullName: string | null;
  avatarUrl: string | null;
}

export interface UserClaims {
  userId: string;
  firmId: string;
  role: "trader" | "admin" | "owner";
  email?: string;
  firm?: FirmSettings;
  profile?: UserProfile;
}

export interface AccountRow {
  id: string;
  status: string;
  startingBalanceCents: string;
  currentBalanceCents: string;
  highestEodBalanceCents: string;
  drawdownFloorCents: string;
  dailyLossFloorCents: string | null;
  tradingDaysCount: number;
  firstTradeAt: string | null;
  breachAt: string | null;
  createdAt: string;
  config: {
    name: string;
    accountSizeCents: string;
    drawdownType: string;
    totalDrawdownPct: string;
    dailyDrawdownPct: string | null;
    profitSplitPct: string;
  };
  currentPhase: {
    phaseNumber: number;
    name: string;
    profitTargetPct: string;
  };
}

interface AppContextValue {
  signedIn: boolean;
  loading: boolean;
  loadError: string | null;
  user: UserClaims | null;
  accounts: AccountRow[];
  activeAccountId: string | null;
  activeAccount: AccountRow | null;
  setActiveAccount: (id: string) => void;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserClaims | null>(null);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [activeAccountId, setActiveAccountIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const setActiveAccount = useCallback((id: string) => {
    setActiveAccountIdState(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
    }
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    setLoadError(null);
    try {
      const me = await api.get<UserClaims>("/api/auth/me");
      setUser(me);
      const accs = await api.get<AccountRow[]>("/api/accounts");
      const safeAccs = Array.isArray(accs) ? accs : [];
      setAccounts(safeAccs);
      const saved =
        typeof window !== "undefined"
          ? window.localStorage.getItem(ACTIVE_ACCOUNT_KEY)
          : null;
      const next =
        (saved && safeAccs.find((a) => a.id === saved)) || safeAccs[0] || null;
      setActiveAccountIdState(next ? next.id : null);
    } catch (err) {
      // 401/403 are expected when signed-out / not yet onboarded.
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setUser(null);
        setAccounts([]);
        setActiveAccountIdState(null);
      } else {
        setLoadError(err instanceof Error ? err.message : String(err));
        setAccounts([]);
        setActiveAccountIdState(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeAccount = Array.isArray(accounts)
    ? (accounts.find((a) => a.id === activeAccountId) ?? accounts[0] ?? null)
    : null;

  return (
    <AppContext.Provider
      value={{
        signedIn: user != null,
        loading,
        loadError,
        user,
        accounts,
        activeAccountId,
        activeAccount,
        setActiveAccount,
        refresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
