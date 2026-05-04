import { NextRequest, NextResponse } from "next/server";

import { resolveServerRole } from "@/lib/auth/server-role";
import { canSendChatEmailNotification } from "@/lib/chat/email-notification-throttle";
import { resolveHumanSenderType } from "@/lib/chat/messageSender";
import { getScriptedFaqAnswer, getSupportHandoffAutoReply } from "@/lib/chat/scriptedFaq";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  notifyCustomerAboutChatMessage,
  notifyNewMessage,
  notifyStaffAboutChatMessage,
} from "@/lib/telegram/notifications";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId")?.trim() ?? null;
  const userIdFromQuery = req.nextUrl.searchParams.get("userId")?.trim() ?? null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let sessionIds: string[] = [];

  if (user?.id) {
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from("chat_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "operator")
      .order("created_at", { ascending: true });

    if (sessionsError) {
      return NextResponse.json({ error: "Не удалось загрузить сессии чата" }, { status: 500 });
    }

    sessionIds = (sessions ?? []).map((s) => s.id).filter(Boolean);
  } else if (!user?.id && sessionId && !userIdFromQuery) {
    sessionIds = [sessionId];
  } else if (!user?.id && userIdFromQuery) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (sessionIds.length === 0) {
    return NextResponse.json({ messages: [], sessionIds: [] as string[] });
  }

  const { data, error } = await supabaseAdmin
    .from("chat_messages")
    .select("*")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: true })
    .limit(50000);

  if (error) {
    return NextResponse.json({ error: "Не удалось загрузить сообщения" }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [], sessionIds });
}

export async function POST(req: NextRequest) {
  let body: { sessionId?: string; content?: string };
  try {
    body = (await req.json()) as { sessionId?: string; content?: string };
  } catch {
    return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim();
  const content = body.content?.trim();

  if (!sessionId || !content) {
    return NextResponse.json({ error: "sessionId и content обязательны" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sessionRow, error: sessionError } = await supabaseAdmin
    .from("chat_sessions")
    .select("id, user_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError || !sessionRow?.id) {
    return NextResponse.json({ error: "Сессия чата не найдена" }, { status: 404 });
  }

  if (user?.id) {
    if (sessionRow.user_id && sessionRow.user_id !== user.id) {
      return NextResponse.json({ error: "Нет доступа к этой сессии" }, { status: 403 });
    }
    await supabaseAdmin.from("chat_sessions").update({ user_id: user.id }).eq("id", sessionId);
  } else if (sessionRow.user_id) {
    return NextResponse.json({ error: "Нет доступа к этой сессии" }, { status: 403 });
  }

  const role = await resolveServerRole(user);
  const isStaff = role === "admin" || role === "operator";
  const senderType = user?.id ? resolveHumanSenderType(role) : "client";

  const { data: inserted, error } = await supabaseAdmin
    .from("chat_messages")
    .insert({
      session_id: sessionId,
      sender_id: user?.id ?? null,
      sender_type: senderType,
      content,
    })
    .select("*")
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: "Не удалось отправить сообщение" }, { status: 500 });
  }

  if (user?.id) {
    await supabaseAdmin
      .from("chat_sessions")
      .update({ first_message_at: new Date().toISOString() })
      .eq("id", sessionId)
      .is("first_message_at", null);
  }

  await notifyNewMessage(sessionId, user?.email ?? null, content).catch(() => {});
  if (senderType === "client") {
    const { count: unreadForStaff } = await supabaseAdmin
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("sender_type", "client")
      .eq("is_read", false);

    // Шлем письмо только когда есть непрочитанные сообщения клиента.
    if ((unreadForStaff ?? 0) > 0 && canSendChatEmailNotification(`staff:${sessionId}`)) {
      const { data: staffRows } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .in("role", ["admin", "operator"])
        .not("email", "is", null);
      const recipients = (staffRows ?? [])
        .map((row) => row.email?.trim().toLowerCase())
        .filter((email): email is string => Boolean(email));

      await notifyStaffAboutChatMessage({
        fromEmail: user?.email ?? null,
        messagePreview: content,
        sessionId,
        recipients,
      }).catch(() => {});
    }
  } else if ((senderType === "operator" || senderType === "admin") && sessionRow.user_id) {
    const { count: unreadForCustomer } = await supabaseAdmin
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .in("sender_type", ["operator", "admin"])
      .eq("is_read", false);

    const { data: customerProfile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", sessionRow.user_id)
      .maybeSingle();

    const customerEmail = customerProfile?.email?.trim();
    // Шлем письмо только когда у клиента есть непрочитанные сообщения от staff.
    if (customerEmail && (unreadForCustomer ?? 0) > 0) {
      if (canSendChatEmailNotification(`customer:${sessionId}`)) {
        await notifyCustomerAboutChatMessage({
          customerEmail,
          senderRoleLabel: senderType === "admin" ? "Администратор" : "Оператор",
          messagePreview: content,
          sessionId,
        }).catch(() => {});
      }
    }
  }

  let autoReply = null;
  if (!isStaff) {
    const scriptedAnswer =
      getScriptedFaqAnswer(content) ??
      getSupportHandoffAutoReply(content) ??
      "Не поняла вопроса. Перевожу вас на поддержку — оператор подключится в ближайшее время.";

    const { data: autoRow } = await supabaseAdmin
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        sender_type: "auto",
        content: scriptedAnswer,
        is_auto_reply: true,
      })
      .select("*")
      .single();
    autoReply = autoRow ?? null;
  }

  return NextResponse.json({ ok: true, message: inserted, autoReply });
}
