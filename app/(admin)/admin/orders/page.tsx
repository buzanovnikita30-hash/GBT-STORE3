import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import type { OrderStatus } from "@/types/database";

export const metadata: Metadata = { title: "Admin · Заказы" };

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-amber-900/30 text-amber-400 border-amber-700/30",
  paid: "bg-emerald-900/30 text-emerald-400 border-emerald-700/30",
  activating: "bg-blue-900/30 text-blue-400 border-blue-700/30",
  waiting_client: "bg-orange-900/30 text-orange-400 border-orange-700/30",
  active: "bg-green-900/30 text-green-400 border-green-700/30",
  failed: "bg-red-900/30 text-red-400 border-red-700/30",
  expired: "bg-gray-800 text-gray-500 border-gray-700",
  refunded: "bg-gray-800 text-gray-500 border-gray-700",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает оплаты",
  paid: "Оплачен",
  activating: "В активации",
  waiting_client: "Ждем клиента",
  active: "Активен",
  failed: "Ошибка",
  expired: "Истек",
  refunded: "Возврат",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status: filterStatus, page: pageParam } = await searchParams;
  const page = Number(pageParam ?? 1);
  const limit = 25;
  const offset = (page - 1) * limit;

  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("*, profiles(email, telegram_username)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filterStatus) {
    query = query.eq("status", filterStatus);
  }

  const { data: orders } = await query;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-gray-900">Заказы</h1>
        <div className="flex gap-2">
          {["", "pending", "activating", "waiting_client", "active", "failed"].map((s) => (
            <a
              key={s || "all"}
              href={s ? `/admin/orders?status=${s}` : "/admin/orders"}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterStatus === s || (!filterStatus && !s)
                  ? "bg-[#10a37f]/10 text-[#0f7d62]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {s ? STATUS_LABELS[s] : "Все"}
            </a>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-widest text-gray-500">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Клиент</th>
              <th className="px-4 py-3">Тариф</th>
              <th className="px-4 py-3">Сумма</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3 min-w-[148px]">Изменить</th>
              <th className="px-4 py-3">Дата</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(orders ?? []).map((order) => {
              const profile = order.profiles as { email?: string; telegram_username?: string } | null;
              return (
                <tr key={order.id} className="text-sm text-gray-700 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <code className="text-[11px] text-gray-500">{order.id.split("-")[0]}…</code>
                    <p className="text-xs text-gray-400">{order.account_email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {profile?.email ?? "—"}
                    {profile?.telegram_username && (
                      <span className="block text-gray-500">@{profile.telegram_username}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs">{order.product === "chatgpt-plus" ? "Plus" : "Pro"} / {order.plan_id}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold">{order.price.toLocaleString("ru")} ₽</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASSES[order.status] ?? STATUS_CLASSES.pending}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <OrderStatusSelect orderId={order.id} initialStatus={order.status as OrderStatus} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleDateString("ru")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
