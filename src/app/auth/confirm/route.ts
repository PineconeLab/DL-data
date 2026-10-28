import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { configured } from "@/lib/config";
import { safeNext } from "@/lib/navigation";
export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get("token_hash"),
    next = safeNext(request.nextUrl.searchParams.get("next"));
  if (hash && configured()) {
    const db = await serverClient();
    const { error } = await db.auth.verifyOtp({
      token_hash: hash,
      type: "email",
    });
    if (!error)
      return NextResponse.redirect(
        new URL(next, process.env.APP_URL || request.url),
      );
  }
  return NextResponse.redirect(
    new URL("/login?error=callback", process.env.APP_URL || request.url),
  );
}
