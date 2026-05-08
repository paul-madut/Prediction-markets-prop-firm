export type FirmRole = 'trader' | 'admin' | 'owner';

/** Decoded Supabase JWT payload — no DB round-trip needed. */
export interface VerifiedToken {
  /** Supabase auth.users.id (UUID). Sourced from the `sub` claim. */
  userId: string;
  /** Supabase session ID, sourced from the `session_id` claim. May be empty on legacy tokens. */
  sessionId: string;
}

/** Full auth context enriched with firm membership from the DB. */
export interface AuthContext extends VerifiedToken {
  firmId: string;
  role: FirmRole;
}
