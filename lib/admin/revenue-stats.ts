import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Admin = SupabaseClient<Database>;

/** Заказы с этими статусами считаем оплаченными для выручки (без pending / failed / expired). */
const REVENUE_STATUSES = ["paid", "activating", "waiting_client", "active"] as const;

function formatMoscowYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Начало календарного дня по Москве (UTC+3) в ISO. */
export function moscowDayStartIso(ymd: string): string {
  return new Date(`${ymd}T00:00:00+03:00`).toISOString();
}

/** Конец календарного дня по Москве. */
export function moscowDayEndIso(ymd: string): string {
  const start = new Date(`${ymd}T00:00:00+03:00`);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
}

export function moscowTodayYmd(now = new Date()): string {
  return formatMoscowYmd(now);
}

export function moscowMonthStartYmd(now = new Date()): string {
  const [y, m] = formatMoscowYmd(now).split("-");
  return `${y}-${m}-01`;
}

export async function sumOrderRevenue(admin: Admin, fromIso: string | undefined, toIso: string | undefined) {
  let q = admin.from("orders").select("price").in("status", [...REVENUE_STATUSES]);
  if (fromIso) q = q.gte("created_at", fromIso);
  if (toIso) q = q.lte("created_at", toIso);
  const { data, error } = await q;
  if (error || !data) return 0;
  return data.reduce((s, row) => s + Number(row.price ?? 0), 0);
}

export async function countOrdersCreated(admin: Admin, fromIso: string, toIso: string) {
  const { count, error } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .gte("created_at", fromIso)
    .lte("created_at", toIso);
  if (error) return 0;
  return count ?? 0;
}

export async function countNewClients(admin: Admin, fromIso: string, toIso: string) {
  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "client")
    .gte("created_at", fromIso)
    .lte("created_at", toIso);
  if (error) return 0;
  return count ?? 0;
}

export type AdminOverviewStats = {
  todayYmd: string;
  /** Выручка */
  revenueToday: number;
  revenue7d: number;
  revenueMonth: number;
  revenueAll: number;
  /** Сегодня */
  ordersToday: number;
  newClientsToday: number;
};

export async function loadAdminOverviewStats(admin: Admin, now = new Date()): Promise<AdminOverviewStats> {
  const todayYmd = moscowTodayYmd(now);
  const dayStart = moscowDayStartIso(todayYmd);
  const dayEnd = moscowDayEndIso(todayYmd);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = moscowDayStartIso(moscowMonthStartYmd(now));

  const [revenueToday, revenue7d, revenueMonth, revenueAll, ordersToday, newClientsToday] = await Promise.all([
    sumOrderRevenue(admin, dayStart, dayEnd),
    sumOrderRevenue(admin, sevenDaysAgo, undefined),
    sumOrderRevenue(admin, monthStart, undefined),
    sumOrderRevenue(admin, undefined, undefined),
    countOrdersCreated(admin, dayStart, dayEnd),
    countNewClients(admin, dayStart, dayEnd),
  ]);

  return {
    todayYmd,
    revenueToday,
    revenue7d,
    revenueMonth,
    revenueAll,
    ordersToday,
    newClientsToday,
  };
}
