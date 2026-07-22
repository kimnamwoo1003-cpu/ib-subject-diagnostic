export function canShowCommunityItem(status: string, own: boolean, isAdmin: boolean) {
  if (status === "deleted") return false;
  if (status === "visible") return true;
  if (status === "hidden") return own || isAdmin;
  return false;
}
