import { createAdminClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { loadAdminOverviewStats } from "@/lib/admin/revenue-stats";

export const metadata: Metadata = { title: "Admin · Главная" };

export default async function AdminOverviewPage() {
  const admin = createAdminClient();

  const [
    overview,
    totalOrdersResp,
    pendingOrdersResp,
    activeOrdersResp,
    openChatsResp,
    pendingReviewsResp,
    totalClientsResp,
    unreadClientMsgsResp,
  ] =
    await Promise.all([
      loadAdminOverviewStats(admin),
      admin.from("orders").select("id", { count: "exact", head: true }),
      admin.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("orders").select("id", { count: "exact", head: true }).eq("status", "active"),
      admin.from("chat_sessions").select("id", { count: "exact", head: true }).eq("status", "open"),
      admin.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client"),
      admin
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_type", "client")
        .eq("is_read", false),
    ]);
  const totalOrders = totalOrdersResp.count ?? 0;
  const pendingOrders = pendingOrdersResp.count ?? 0;
  const activeOrders = activeOrdersResp.count ?? 0;
  const openChats = openChatsResp.count ?? 0;
  const pendingReviews = pendingReviewsResp.count ?? 0;
  const totalClients = totalClientsResp.count ?? 0;
  const unreadClientMsgs = unreadClientMsgsResp.count ?? 0;

  const stat = (label: string, value: string | number, color: string) => (
    <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
      <p className={`font-heading text-2xl font-bold md:text-3xl ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-400">{label}</p>
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="mb-6 font-heading text-2xl font-bold text-gray-900">Панель администратора</h1>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Сегодня</h2>
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3">
        {stat("Заказов сегодня", overview.ordersToday, "text-gray-900")}
        {stat("Выручка сегодня", `${overview.revenueToday.toLocaleString("ru")} ₽`, "text-[#10a37f]")}
        {stat("Новые клиенты", overview.newClientsToday, "text-blue-600")}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">Выручка (оплаченные и далее)</h2>
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stat("Сегодня", `${overview.revenueToday.toLocaleString("ru")} ₽`, "text-emerald-600")}
        {stat("7 дней", `${overview.revenue7d.toLocaleString("ru")} ₽`, "text-emerald-600")}
        {stat("Месяц", `${overview.revenueMonth.toLocaleString("ru")} ₽`, "text-emerald-600")}
        {stat("Всё время", `${overview.revenueAll.toLocaleString("ru")} ₽`, "text-emerald-700")}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">В работе</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {stat("Клиентов всего", totalClients, "text-gray-900")}
        {stat("Заказов всего", totalOrders, "text-gray-900")}
        {stat("Ожидают оплаты", pendingOrders, "text-amber-500")}
        {stat("Активных подписок", activeOrders, "text-[#10a37f]")}
        {stat("Открытые чаты", openChats, "text-blue-500")}
        {stat("Непрочитано от клиентов", unreadClientMsgs, "text-orange-500")}
        {stat("Отзывы на модерации", pendingReviews, "text-purple-500")}
      </div>

      <p className="mt-6 text-xs text-gray-500">
        Выручка суммирует заказы со статусами оплата получена и далее по цепочке активации. Учёт по дате создания
        заказа в базе; точный учёт — у платёжного провайдера.
      </p>
    </div>
  );
}
