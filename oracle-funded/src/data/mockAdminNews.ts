// Plan §3 / §7 — news_events table.
// firm_id is nullable: null = applies to all firms.
// market_filter is nullable: null = applies to all markets.

export interface NewsEvent {
  id: string;
  firmId: string | null;
  marketFilter: string | null;
  eventName: string;
  startsAt: string;
  endsAt: string;
  cooldownMinutes: number;
  createdAt: string;
}

// Today is 2026-05-02
export const mockAdminNews: NewsEvent[] = [
  {
    id: "news_fomc_may26",
    firmId: null,
    marketFilter: "KXFEDDECISION-*",
    eventName: "FOMC Rate Decision — May 2026",
    startsAt: "2026-05-02T17:55:00Z",
    endsAt: "2026-05-02T18:30:00Z",
    cooldownMinutes: 5,
    createdAt: "2026-04-15T10:00:00Z",
  },
  {
    id: "news_nfp_jun26",
    firmId: null,
    marketFilter: "KXNFP-*",
    eventName: "Non-Farm Payrolls — June 2026",
    startsAt: "2026-06-06T12:25:00Z",
    endsAt: "2026-06-06T13:00:00Z",
    cooldownMinutes: 3,
    createdAt: "2026-04-30T09:00:00Z",
  },
];

export type NewsEventTag = "active" | "upcoming" | "past";

export function getNewsEventTag(event: NewsEvent, now: Date = new Date()): NewsEventTag {
  const start = new Date(event.startsAt).getTime();
  const end = new Date(event.endsAt).getTime();
  const t = now.getTime();
  if (t >= start && t <= end) return "active";
  if (t < start) return "upcoming";
  return "past";
}
