import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { resolvePostLoginPath } from "@/lib/auth/postLoginPath";
import { syncProfileRoleForUser } from "@/lib/auth/syncProfileRole";
import type { Database } from "@/types/database";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
}

function verifyEmailErrorRedirect(request: NextRequest, kind: "expired" | "used" | "callback") {
  const target = new URL("/verify-email", request.url);
  target.searchParams.set("error", kind);
  return NextResponse.redirect(target);
}

function recoveryErrorRedirect(request: NextRequest, kind: "expired" | "callback") {
  const target = new URL("/reset-password", request.url);
  target.searchParams.set("error", kind);
  return NextResponse.redirect(target);
}

function classifyExchangeError(message: string): "expired" | "used" | "callback" {
  const m = message.toLowerCase();
  if (m.includes("expired") || m.includes("flow_state") || m.includes("invalid flow")) {
    return "expired";
  }
  if (m.includes("already been") || m.includes("already registered")) {
    return "used";
  }
  return "callback";
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const oauthErr = url.searchParams.get("error");
  const errCode = url.searchParams.get("error_code");
  const errDesc = (url.searchParams.get("error_description") ?? "").replace(/\+/g, " ");
  const rawReturnUrl = url.searchParams.get("returnUrl") ?? "/cabinet";
  const returnUrl =
    rawReturnUrl.startsWith("/") && !rawReturnUrl.startsWith("//") ? rawReturnUrl : "/cabinet";

  if (type === "recovery") {
    if (oauthErr || errCode) {
      const blob = `${errCode ?? ""} ${errDesc} ${oauthErr ?? ""}`.toLowerCase();
      if (
        blob.includes("expired") ||
        errCode === "otp_expired" ||
        errCode === "flow_state_expired"
      ) {
        return recoveryErrorRedirect(request, "expired");
      }
      return recoveryErrorRedirect(request, "callback");
    }

    const update = new URL("/reset-password/update", request.url);
    update.searchParams.set("returnUrl", returnUrl);
    const response = NextResponse.redirect(update);

    if (!code) {
      return recoveryErrorRedirect(request, "callback");
    }

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return recoveryErrorRedirect(request, "expired");
    }

    return response;
  }

  if (type !== "recovery") {
    if (oauthErr || errCode) {
      const blob = `${errCode ?? ""} ${errDesc} ${oauthErr ?? ""}`.toLowerCase();
      if (
        blob.includes("expired") ||
        errCode === "otp_expired" ||
        errCode === "flow_state_expired"
      ) {
        return verifyEmailErrorRedirect(request, "expired");
      }
      if (blob.includes("already")) {
        return verifyEmailErrorRedirect(request, "used");
      }
      return verifyEmailErrorRedirect(request, "callback");
    }
  }

  const provisional = new URL(returnUrl, request.url);
  const response = NextResponse.redirect(provisional);

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return verifyEmailErrorRedirect(request, classifyExchangeError(error.message));
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("error", "callback");
    login.searchParams.set("returnUrl", returnUrl);
    return NextResponse.redirect(login);
  }

  let role;
  try {
    role = await syncProfileRoleForUser(user.id, user.email ?? null);
  } catch {
    const login = new URL("/login", request.url);
    login.searchParams.set("error", "sync");
    login.searchParams.set("returnUrl", returnUrl);
    return NextResponse.redirect(login);
  }

  const path = resolvePostLoginPath(returnUrl, role);
  const finalUrl = new URL(path, request.url);

  if (finalUrl.pathname !== provisional.pathname || finalUrl.search !== provisional.search) {
    const nextResponse = NextResponse.redirect(finalUrl);
    copyCookies(response, nextResponse);
    return nextResponse;
  }

  return response;
}
