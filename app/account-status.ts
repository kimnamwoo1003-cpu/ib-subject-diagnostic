export type AccountSanction = { accountStatus?: string | null; suspendedUntil?: string | null; suspensionReason?: string | null };

export function activeSanction(profile: AccountSanction | null | undefined, now = new Date()) {
  if (!profile || profile.accountStatus === "active" || !profile.accountStatus) return null;
  if (profile.accountStatus === "banned") return { kind: "banned" as const, until: null, reason: profile.suspensionReason || "This account has been permanently suspended." };
  const until = profile.suspendedUntil ? new Date(profile.suspendedUntil) : null;
  if (profile.accountStatus === "suspended" && until && until.getTime() > now.getTime()) {
    return { kind: "suspended" as const, until: until.toISOString(), reason: profile.suspensionReason || "This account is temporarily suspended." };
  }
  return null;
}
