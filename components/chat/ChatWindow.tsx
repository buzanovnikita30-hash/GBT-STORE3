"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, Profile } from "@/types";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { formatDate } from "@/lib/chat/constants";
import { OPERATOR_CHAT_QUICK_REPLIES } from "@/lib/chat/scriptedFaq";
import { cn } from "@/lib/utils";
import type { ChatRoomListItem } from "@/types/chat-ui";

type RoomStatus = NonNullable<ChatRoomListItem["status"]> | "open" | "closed" | "waiting";

function playClientPing() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 660;
    g.gain.setValueAtTime(0.05, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.1);
    window.setTimeout(() => ctx.close(), 200);
  } catch {
    /* noop */
  }
}

interface ChatWindowProps {
  currentUser: Profile;
  sessionId: string;
  roomStatus?: RoomStatus;
  otherPartyName?: string;
  /** Для подзаголовка: клиент в ЛК или сотрудник в админке */
  viewerIsStaff: boolean;
}

function messageIsOwn(msg: ChatMessage, currentUserId: string): boolean {
  return Boolean(msg.sender_id && msg.sender_id === currentUserId);
}

export function ChatWindow({
  currentUser,
  sessionId,
  roomStatus = "open",
  otherPartyName,
  viewerIsStaff,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [headerPulse, setHeaderPulse] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const forceScrollRef = useRef(false);
  const lastSeenMessageIdRef = useRef<string | null>(null);
  const supabase = createClient();

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  const isNearBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceToBottom < 120;
  }, []);

  const loadMessages = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch(
        `/api/chat/messages?session_id=${encodeURIComponent(sessionId)}`,
        { credentials: "include" }
      );
      const data = (await res.json()) as { messages?: ChatMessage[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Ошибка загрузки");
      setMessages(data.messages ?? []);
    } catch (e: unknown) {
      if (!silent) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки сообщений");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const lastMessageId = messages.at(-1)?.id ?? null;
    const hasNewMessage = lastMessageId !== null && lastMessageId !== lastSeenMessageIdRef.current;

    if (messages.length > 0 && (forceScrollRef.current || (hasNewMessage && isNearBottom()))) {
      scrollToBottom(messages.length > 1);
    }

    forceScrollRef.current = false;
    lastSeenMessageIdRef.current = lastMessageId;
  }, [messages, scrollToBottom, isNearBottom]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-session:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as ChatMessage;
          if (
            !viewerIsStaff &&
            row?.sender_type &&
            ["operator", "admin"].includes(row.sender_type) &&
            row.sender_id !== currentUser.id
          ) {
            setHeaderPulse(true);
            window.setTimeout(() => setHeaderPulse(false), 1600);
            if (typeof document !== "undefined" && document.hidden) {
              playClientPing();
              if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                try {
                  new Notification("GPT STORE — новое сообщение", {
                    body: (row.content ?? "").slice(0, 140) || "Ответ поддержки",
                    tag: `chat-${sessionId}`,
                  });
                } catch {
                  /* noop */
                }
              }
            }
          }
          void loadMessages({ silent: true });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, supabase, loadMessages, viewerIsStaff, currentUser.id]);

  useEffect(() => {
    if (viewerIsStaff || typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      void Notification.requestPermission().catch(() => {});
    }
  }, [viewerIsStaff]);

  /** Резерв, если Realtime не доставляет события (репликация / RLS). */
  useEffect(() => {
    const t = window.setInterval(() => {
      void loadMessages({ silent: true });
    }, 4000);
    return () => window.clearInterval(t);
  }, [sessionId]);

  const mergeById = useCallback((prev: ChatMessage[], additions: ChatMessage[]) => {
    const map = new Map<string, ChatMessage>();
    for (const m of prev) map.set(m.id, m);
    for (const m of additions) map.set(m.id, m);
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, []);

  const handleSend = async (
    text: string,
    attachment?: { url: string; type: string; name: string }
  ) => {
    const res = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        session_id: sessionId,
        content: text.trim(),
        attachment: attachment ?? null,
      }),
    });
    const data = (await res.json()) as {
      error?: string;
      message?: ChatMessage;
      autoReply?: ChatMessage | null;
    };
    if (!res.ok) throw new Error(data.error ?? "Ошибка отправки");

    const toAdd: ChatMessage[] = [];
    if (data.message) toAdd.push(data.message);
    if (data.autoReply) toAdd.push(data.autoReply);
    if (toAdd.length) {
      forceScrollRef.current = true;
      setMessages((prev) => mergeById(prev, toAdd));
      scrollToBottom(true);
    }
    void loadMessages({ silent: true });
  };

  const grouped: { date: string; messages: ChatMessage[] }[] = [];
  for (const msg of messages) {
    const date = formatDate(msg.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) last.messages.push(msg);
    else grouped.push({ date, messages: [msg] });
  }

  const closed = roomStatus === "closed";

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-x-hidden">
      <div
        className={cn(
          "flex items-center gap-3 border-b px-3 py-3 transition-colors sm:px-4",
          headerPulse ? "border-[#10a37f]/40 bg-[#10a37f]/8" : "border-gray-100 bg-white"
        )}
      >
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-transform",
            viewerIsStaff ? "bg-amber-100 text-amber-800" : "bg-[#10a37f]/15 text-[#10a37f]",
            headerPulse && !viewerIsStaff && "scale-110 motion-safe:animate-pulse"
          )}
        >
          {viewerIsStaff ? "К" : "G"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">
            {otherPartyName ?? (viewerIsStaff ? "Клиент" : "GPT STORE — поддержка")}
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                roomStatus === "open" ? "bg-green-500" : roomStatus === "waiting" ? "bg-amber-400" : "bg-gray-300"
              )}
            />
            <span className="text-xs text-gray-400">
              {roomStatus === "open"
                ? "Активен"
                : roomStatus === "waiting"
                  ? "Ожидает ответа"
                  : roomStatus === "closed"
                    ? "Закрыт"
                    : "Чат"}
            </span>
          </div>
        </div>
      </div>

      <div
        ref={messagesContainerRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-gray-50 p-3 sm:p-4"
      >
        {loading && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
              <span className="text-sm">Загрузка...</span>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <p className="text-sm text-red-500">{error}</p>
            <button
              type="button"
              onClick={() => void loadMessages()}
              className="text-sm text-[#10a37f] underline hover:text-[#0d8f68]"
            >
              Повторить
            </button>
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
            <p className="text-sm">Нет сообщений. Начните диалог.</p>
          </div>
        )}

        {!loading &&
          !error &&
          grouped.map(({ date, messages: dayMsgs }) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="bg-gray-50 px-2 text-xs text-gray-400">{date}</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              {dayMsgs.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={messageIsOwn(msg, currentUser.id)}
                />
              ))}
            </div>
          ))}

        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 z-20 bg-white">
        {!error && !viewerIsStaff && !closed && (
          <div className="border-t border-gray-100 bg-white px-3 pt-2">
            <div className="flex flex-wrap gap-1.5 pb-2 md:flex-nowrap md:overflow-x-auto md:[-ms-overflow-style:none] md:[scrollbar-width:none] md:[&::-webkit-scrollbar]:hidden">
              {OPERATOR_CHAT_QUICK_REPLIES.map(({ label, message }) => (
                <button
                  key={message}
                  type="button"
                  onClick={() => void handleSend(message)}
                  className="max-w-full rounded-full border border-[#10a37f]/35 bg-white px-3 py-1.5 text-xs font-medium text-[#10a37f] transition-colors hover:bg-[#10a37f]/10 md:shrink-0"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <ChatInput
          onSend={handleSend}
          disabled={closed}
          placeholder={closed ? "Чат закрыт" : "Напишите сообщение…"}
        />
      </div>
    </div>
  );
}
