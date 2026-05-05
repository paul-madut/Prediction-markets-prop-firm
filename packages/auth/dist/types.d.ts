export type FirmRole = 'trader' | 'admin' | 'owner';
/** Decoded Clerk JWT payload — no DB round-trip needed. */
export interface VerifiedToken {
    userId: string;
    sessionId: string;
}
/** Full auth context enriched with firm membership from the DB. */
export interface AuthContext extends VerifiedToken {
    firmId: string;
    role: FirmRole;
}
//# sourceMappingURL=types.d.ts.map