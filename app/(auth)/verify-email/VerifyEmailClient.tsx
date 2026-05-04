"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resolvePostLoginPath } from "@/lib/auth/postLoginPath";
import type { UserRole } from "@/types/database";

const RESEND_COOLDOWN_SEC = 30;
const POLL_MS = 2500;

function mapQueryError(param: string | null): "expired" | "used" | "callback" | null {
  if (param === "expired" || param === "used" || param === "callback") return param;
  return null;
}

function errorBannerText(kind: "expired" | "used" | "callback"): string {
  if (kind === "expired") return "Ссылка истекла. Отправьте письмо ещё раз.";
  if (kind === "used") return "Аккаунт уже подтверждён";
  return "Не удалось подтвердить email. Запросите новое письмо.";
}

function mapResendError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "Слишком часто запрашиваете письмо. Подождите немного и попробуйте снова.";
  }
  if (m.includes("already") || m.includes("confirmed")) {
    return "Аккаунт уже подтверждён. Повторная отправка письма не требуется.";
  }
  return "Не удалось отправить письмо повторно. Попробуйте позже.";
}

export function VerifyEmailClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const email = (searchParams.get("email") ?? "").trim();
  const queryErr = mapQueryError(searchParams.get("error"));
  const justSentParam = searchParams.get("sent") === "1";

  const [resendIn, setResendIn] = useState(RESEND_COOLDOWN_SEC);
  const [resendPhase, setResendPhase] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resendError, setResendError] = useState<string | null>(null);
  const [entryPhase, setEntryPhase] = useState<"none" | "entering">("none");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [showJustSent, setShowJustSent] = useState(false);
  const didRedirect = useRef(false);
  const strippedSent = useRef(false);
  const firstPollDone = useRef(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  useEffect(() => {
    if (!justSentParam || strippedSent.current) return;
    strippedSent.current = true;
    setShowJustSent(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("sent");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [justSentParam, pathname, router, searchParams]);

  const syncAndGo = useCallback(async () => {
    if (didRedirect.current) return;
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email_confirmed_at) return;

    didRedirect.current = true;
    setEntryPhase("entering");
    const syncRes = await fetch("/api/auth/sync-role", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const syncBody = (await syncRes.json().catch(() => ({}))) as { role?: UserRole };
    const role: UserRole =
      syncBody.role === "admin" || syncBody.role === "operator" || syncBody.role === "client"
        ? syncBody.role
        : "client";
    const target = resolvePostLoginPath("/cabinet", role);
    router.push(target);
    router.refresh();
  }, [router]);

  useEffect(() => {
    const supabase = createClient();

    const poll = async () => {
      if (didRedirect.current) return;
      try {
        await supabase.auth.getSession();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email_confirmed_at) {
          await syncAndGo();
        }
      } catch {
        // Supabase может временно вернуть ошибку refresh token;
        // в этом случае продолжаем polling и не блокируем интерфейс.
      } finally {
        if (!firstPollDone.current) {
          firstPollDone.current = true;
          setSessionChecked(true);
        }
      }
    };

    const interval = setInterval(() => void poll(), POLL_MS);
    void poll();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user?.email_confirmed_at) void syncAndGo();
    });

    return () => {
      clearInterval(interval);
      sub.subscription.unsubscribe();
    };
  }, [syncAndGo]);

  async function handleResend() {
    if (!email || resendIn > 0 || resendPhase === "sending") return;
    setResendPhase("sending");
    setResendError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/callback?returnUrl=/cabinet`,
      },
    });
    if (error) {
      setResendPhase("error");
      setResendError(mapResendError(error.message));
      return;
    }
    setResendPhase("sent");
    setResendIn(RESEND_COOLDOWN_SEC);
  }

  if (!sessionChecked) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#10a37f]/10">
          <Loader2 size={28} className="animate-spin text-[#10a37f]" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">Загрузка</h1>
        <p className="text-sm text-gray-500">Проверяем сессию…</p>
      </div>
    );
  }

  if (entryPhase === "entering") {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#10a37f]/10">
          <Loader2 size={28} className="animate-spin text-[#10a37f]" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">Вы зарегистрированы успешно</h1>
        <p className="text-sm text-gray-600">Можно возвращаться. Открываем личный кабинет…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#10a37f]/10">
        {resendPhase === "sending" ? (
          <Loader2 size={26} className="animate-spin text-[#10a37f]" />
        ) : (
          <MailCheck size={26} className="text-[#10a37f]" />
        )}
      </div>
      <h1 className="font-heading text-2xl font-bold text-gray-900 mb-3">Проверьте почту</h1>
      {queryErr && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorBannerText(queryErr)}
        </p>
      )}
      {showJustSent && (
        <p className="mb-3 rounded-lg border border-[#10a37f]/30 bg-[#10a37f]/8 px-3 py-2 text-sm text-[#0f766e]">
          Письмо отправлено
        </p>
      )}
      <p className="text-sm text-gray-500 leading-relaxed mb-6">
        Мы отправили письмо для подтверждения регистрации. Откройте письмо и нажмите «Подтвердить email».
        После подтверждения вы будете автоматически перенаправлены в личный кабинет.
      </p>
      {email ? (
        <div className="mb-6 space-y-3 text-left">
          <p className="text-xs text-gray-400 break-all">Отправлено на: {email}</p>
          {resendPhase === "sending" && (
            <p className="text-xs text-gray-500">Письмо отправляется…</p>
          )}
          {resendPhase === "sent" && (
            <p className="text-xs text-[#0f766e]">Письмо отправлено повторно</p>
          )}
          {resendPhase === "error" && resendError && (
            <p className="text-xs text-red-600">{resendError}</p>
          )}
          <button
            type="button"
            disabled={resendIn > 0 || resendPhase === "sending"}
            onClick={() => void handleResend()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/[0.12] py-2.5 text-sm font-medium text-gray-800 transition-opacity hover:bg-gray-50 disabled:opacity-50"
          >
            {resendPhase === "sending" && <Loader2 size={15} className="animate-spin" />}
            {resendIn > 0 ? `Отправить повторно через ${resendIn} с` : "Отправить повторно"}
          </button>
        </div>
      ) : (
        <p className="mb-6 text-xs text-amber-800">
          Не указан email. Вернитесь к{" "}
          <a href="/register" className="text-[#10a37f] hover:underline">
            регистрации
          </a>
          .
        </p>
      )}
      <p className="text-xs text-gray-400">Не нашли письмо? Проверьте папку «Спам».</p>
    </div>
  );
}
