import AdminClient from "./admin-client";
import { redirect } from "next/navigation";
import { requireApiUser } from "../server-auth";

export default async function AdminPage() {
  const user = await requireApiUser();
  if (!user?.isAdmin) redirect("/");

  return <AdminClient adminName={user.displayName} />;
}
