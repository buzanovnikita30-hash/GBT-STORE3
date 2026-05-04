import { NextRequest, NextResponse } from "next/server";

import { resolveServerRole } from "@/lib/auth/server-role";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/types/database";
import { notifyCustomerOrderStatus, notifyManualOrderStatusChange } from "@/lib/telegram/notifications";

const ALLOWED: OrderStatus[] = [
  "pending",
  "paid",
  "activating",
  "waiting_client",
  "active",
  "failed",
  "refunded",
  "expired",
];

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await ctx.params;
  if (!orderId) {
    return NextResponse.json({ error: "Нет id" }, { status: 400 });
  }

  let body: { status?: string };
  try {
    body = (await req.json()) as { status?: string };
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 });
  }

  const next = body.status as OrderStatus;
  if (!next || !ALLOWED.includes(next)) {
    return NextResponse.json({ error: "Недопустимый статус" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = await resolveServerRole(user);
  if (role !== "admin" && role !== "operator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: order, error: findErr } = await admin.from("orders").select("*").eq("id", orderId).single();

  if (findErr || !order) {
    return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  }

  const prev = order.status as OrderStatus;
  if (prev === next) {
    return NextResponse.json({ ok: true, status: next });
  }

  const { error: updErr } = await admin.from("orders").update({ status: next }).eq("id", orderId);
  if (updErr) {
    return NextResponse.json({ error: "Не удалось обновить" }, { status: 500 });
  }

  const planTitle = order.plan_name?.trim() || order.plan_id;

  await notifyManualOrderStatusChange({
    id: order.id,
    plan_name: planTitle,
    plan_id: order.plan_id,
    price: order.price,
    account_email: order.account_email,
    prev,
    next,
  }).catch(() => {});

  if (order.user_id) {
    const { data: profile } = await admin.from("profiles").select("email").eq("id", order.user_id).maybeSingle();
    if (profile?.email) {
      await notifyCustomerOrderStatus({
        customerEmail: profile.email,
        orderId: order.id,
        planName: planTitle,
        status: next,
        price: order.price,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, status: next });
}
