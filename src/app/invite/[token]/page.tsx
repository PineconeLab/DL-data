import { redirect, notFound } from "next/navigation";
import { configured } from "@/lib/config";
import { serverClient } from "@/lib/supabase/server";
import { ConfigNotice } from "@/components/config-notice";
import { InviteAccept } from "@/components/invite-accept";
export const dynamic = "force-dynamic";
export default async function Invitation({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  if (!configured()) return <ConfigNotice />;
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent("/invite/" + token));
  return <InviteAccept token={token} />;
}
