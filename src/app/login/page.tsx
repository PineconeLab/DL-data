import { redirect } from "next/navigation";
import { configured } from "@/lib/config";
import { serverClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/navigation";
import { ConfigNotice } from "@/components/config-notice";
import { AuthForm } from "@/components/auth-form";
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (!configured()) return <ConfigNotice />;
  const params = await searchParams,
    next = safeNext(params.next || null),
    db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (user) redirect(next);
  return <AuthForm next={next} callbackError={!!params.error} />;
}
