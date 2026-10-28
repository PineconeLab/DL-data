import { redirect } from "next/navigation";
import { configured } from "@/lib/config";
import { serverClient } from "@/lib/supabase/server";
import { ConfigNotice } from "@/components/config-notice";
import { Dashboard } from "@/components/dashboard";
export const dynamic = "force-dynamic";
export default async function Home() {
  if (!configured()) return <ConfigNotice />;
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");
  return <Dashboard />;
}
