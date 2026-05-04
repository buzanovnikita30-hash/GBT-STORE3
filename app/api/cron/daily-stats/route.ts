import { NextRequest, NextResponse } from "next/server";

import { loadAdminOverviewStats } from "@/lib/admin/revenue-stats";
import { createAdminClient } from "@/lib/supabase/server";
import { notifyDailyAdminDigest } from "@/lib/telegram/notifications";

/**
 * Ежедневная сводка для админа (~23:59 по Москве при cron в 20:59 UTC).
 * Vercel: задайте CRON_SECRET и добавьте cron на этот путь.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const ok =
    secret &&
    (auth === `Bearer ${secret}` || req.headers.get("x-cron-secret") === secret);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const stats = await loadAdminOverviewStats(admin);
    const dateLabel = stats.todayYmd;
    await notifyDailyAdminDigest({
      dateLabel,
      ordersToday: stats.ordersToday,
      revenueToday: stats.revenueToday,
      newClientsToday: stats.newClientsToday,
      revenue7d: stats.revenue7d,
      revenueMonth: stats.revenueMonth,
    }).catch(() => {});
    return NextResponse.json({ ok: true, dateLabel });
  } catch {
    return NextResponse.json({ error: "digest_failed" }, { status: 500 });
  }
}
