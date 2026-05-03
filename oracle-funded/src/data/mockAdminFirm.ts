// Plan §3 — firms + firm_members.

export interface Firm {
  id: string;
  name: string;
  slug: string;
  brandConfig: {
    primaryColor: string;
    supportEmail: string;
  };
  enabledVenues: ("kalshi" | "polymarket")[];
  status: "active" | "paused" | "disabled";
  riskDefaults: {
    minOrderAgeMs: number;
    maxPositionsPerMarket: number;
    maxPositionsTotal: number;
    refundDisablesAccount: boolean;
  };
  createdAt: string;
}

export interface FirmMember {
  id: string;
  firmId: string;
  userId: string;
  name: string;
  email: string;
  role: "trader" | "admin" | "owner";
  twoFactorEnrolled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export const mockAdminFirm: Firm = {
  id: "firm_oraclefunded",
  name: "OracleFunded",
  slug: "oraclefunded",
  brandConfig: {
    primaryColor: "#4F46E5",
    supportEmail: "support@oraclefunded.com",
  },
  enabledVenues: ["kalshi"],
  status: "active",
  riskDefaults: {
    minOrderAgeMs: 500,
    maxPositionsPerMarket: 1,
    maxPositionsTotal: 5,
    refundDisablesAccount: true,
  },
  createdAt: "2026-03-01T00:00:00Z",
};

export const mockAdminFirmMembers: FirmMember[] = [
  {
    id: "member_001",
    firmId: mockAdminFirm.id,
    userId: "user_owner_paul",
    name: "Paul Madut",
    email: "pmadut2003@gmail.com",
    role: "owner",
    twoFactorEnrolled: true,
    lastLoginAt: "2026-05-02T22:10:00Z",
    createdAt: "2026-03-01T00:00:00Z",
  },
  {
    id: "member_002",
    firmId: mockAdminFirm.id,
    userId: "user_admin_maria",
    name: "Maria Chen",
    email: "maria@oraclefunded.com",
    role: "admin",
    twoFactorEnrolled: true,
    lastLoginAt: "2026-05-02T16:45:00Z",
    createdAt: "2026-03-15T00:00:00Z",
  },
  {
    id: "member_003",
    firmId: mockAdminFirm.id,
    userId: "user_admin_devin",
    name: "Devin Walsh",
    email: "devin@oraclefunded.com",
    role: "admin",
    twoFactorEnrolled: false, // adversarial: missing 2FA
    lastLoginAt: "2026-04-30T11:20:00Z",
    createdAt: "2026-04-10T00:00:00Z",
  },
];
