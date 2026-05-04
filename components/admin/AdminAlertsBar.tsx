"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AlertItem = { id: string; title: string; body: string; href: string; at: number };

const READ_KEY = "gptstore-admin-alert-read-ids";

function loadRead(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveRead(ids: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids].slice(-200)));
  } catch {
    /* noop */
  }
}

function playPing() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.07, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.12);
    window.setTimeout(() => ctx.close(), 200);
  } catch {
    /* noop */
  }
}

export function AdminAlertsBar() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AlertItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const supabase = useMemo(() => createClient(), []);
  const bootRef = useRef(false);

  useEffect(() => {
    setReadIds(loadRead());
  }, []);

  const pushAlert = useCallback((item: AlertItem, sound: boolean) => {
    setItems((prev) => {
      const next = [item, ...prev.filter((x) => x.id !== item.id)].slice(0, 40);
      return next;
    });
    if (sound) {
      const r = loadRead();
      if (!r.has(item.id)) playPing();
    }
  }, []);

  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;

    const ch = supabase
      .channel("admin-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const row = payload.new as { id?: string; plan_id?: string; price?: number };
          if (!row?.id) return;
          pushAlert(
            {
              id: `order-ins-${row.id}`,
              title: "🔔 Новый заказ",
              body: `${row.plan_id ?? "тариф"} · ${row.price ?? "?"} ₽`,
              href: "/admin/orders",
              at: Date.now(),
            },
            true
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const row = payload.new as { id?: string; status?: string };
          const old = payload.old as { status?: string };
          if (!row?.id || row.status === old?.status) return;
          if (row.status === "activating" || row.status === "paid") {
            pushAlert(
              {
                id: `order-paid-${row.id}-${row.status}`,
                title: "🔔 Оплата пришла",
                body: `Заказ ${row.id.slice(0, 8)}…`,
                href: "/admin/orders",
                at: Date.now(),
              },
              true
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const row = payload.new as { id?: string; sender_type?: string; content?: string };
          if (!row?.id || row.sender_type !== "client") return;
          const preview = (row.content ?? "").slice(0, 80);
          pushAlert(
            {
              id: `msg-${row.id}`,
              title: "🔔 Клиент написал",
              body: preview || "Новое сообщение",
              href: "/admin/chat",
              at: Date.now(),
            },
            true
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [supabase, pushAlert]);

  const unread = items.filter((i) => !readIds.has(i.id)).length;

  function markAllRead() {
    const next = new Set(readIds);
    for (const i of items) next.add(i.id);
    setReadIds(next);
    saveRead(next);
  }

  function onOpenItem(id: string) {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    saveRead(next);
  }

  return (
    <div className="relative border-b border-gray-200 bg-white px-4 py-2">
      <div className="mx-auto flex max-w-6xl items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="relative inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-100"
        >
          <Bell size={16} className={unread > 0 ? "text-[#10a37f]" : "text-gray-500"} />
          Уведомления
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className="absolute right-4 top-full z-50 mt-1 w-[min(100vw-2rem,380px)] rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <span className="text-xs font-semibold text-gray-500">Последние события</span>
            <button type="button" className="text-xs text-[#10a37f] hover:underline" onClick={markAllRead}>
              Прочитать всё
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-gray-400">Пока тихо — новые события появятся здесь</li>
            )}
            {items.map((i) => (
              <li key={i.id} className="border-b border-gray-50 last:border-0">
                <Link
                  href={i.href}
                  onClick={() => onOpenItem(i.id)}
                  className={cn(
                    "block px-3 py-2.5 text-left transition-colors hover:bg-gray-50",
                    !readIds.has(i.id) && "bg-[#10a37f]/5"
                  )}
                >
                  <p className="text-xs font-semibold text-gray-900">{i.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{i.body}</p>
                  <p className="mt-1 text-[10px] text-gray-400">
                    {new Date(i.at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
