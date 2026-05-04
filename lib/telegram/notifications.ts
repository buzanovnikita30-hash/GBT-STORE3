const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const DEFAULT_FROM = "GPT STORE <onboarding@resend.dev>";

/** Один адрес для операционных писем: ADMIN_EMAIL → SUPPORT_NOTIFICATION_EMAIL → первый из ADMIN_EMAILS. */
export function resolveAdminNotificationEmail(): string | null {
  const primary = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (primary) return primary;
  if (process.env.SUPPORT_NOTIFICATION_EMAIL?.trim()) {
    return process.env.SUPPORT_NOTIFICATION_EMAIL.trim().toLowerCase();
  }
  const fromAdminList = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .find(Boolean);
  return fromAdminList ?? null;
}

function resolveStaffNotificationEmails(): string[] {
  const candidates = [
    process.env.ADMIN_EMAIL,
    process.env.SUPPORT_NOTIFICATION_EMAIL,
    ...(process.env.ADMIN_EMAILS ?? "").split(","),
  ]
    .map((x) => (x ?? "").trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(candidates));
}

async function sendSupportEmail(subject: string, text: string, html?: string) {
  const supportEmail = resolveAdminNotificationEmail();
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM;

  if (!supportEmail) {
    console.warn("[Email] Пропущено: не найден email для уведомлений staff");
    return;
  }
  if (!resendKey) {
    console.warn("[Email] Пропущено: RESEND_API_KEY не задан");
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [supportEmail],
        subject,
        text,
        html: html ?? `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${text}</pre>`,
      }),
    });
    if (!res.ok) {
      console.error("[Email] Ошибка отправки:", await res.text());
    }
  } catch (error) {
    console.error("[Email] Сетевая ошибка:", error);
  }
}

async function sendEmail(to: string, subject: string, text: string, html?: string) {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM;
  if (!to) {
    console.warn("[Email] Пропущено: пустой получатель");
    return;
  }
  if (!resendKey) {
    console.warn("[Email] Пропущено: RESEND_API_KEY не задан");
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        text,
        html: html ?? `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${text}</pre>`,
      }),
    });
    if (!res.ok) {
      console.error("[Email] Ошибка отправки:", await res.text());
    }
  } catch (error) {
    console.error("[Email] Сетевая ошибка:", error);
  }
}

async function sendEmailMany(to: string[], subject: string, text: string, html?: string) {
  if (!to.length) return;
  await Promise.all(to.map((email) => sendEmail(email, subject, text, html)));
}

async function sendTelegramMessage(chatId: string, text: string) {
  if (!BOT_TOKEN || !chatId) return;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error("[Telegram] Ошибка отправки:", await res.text());
    }
  } catch (err) {
    console.error("[Telegram] Сетевая ошибка:", err);
  }
}

export async function notifyNewUser(user: {
  id?: string;
  username?: string | null;
  email?: string | null;
  telegram_username?: string | null;
}) {
  const text = `🆕 <b>Новый пользователь</b>
📧 Email: ${user.email ?? "не указан"}
📱 Telegram: ${user.telegram_username ? "@" + user.telegram_username : "нет"}
🔗 <a href="${APP_URL}/admin/users">Открыть в админке</a>`;
  await sendTelegramMessage(ADMIN_CHAT_ID, text);
  await sendSupportEmail(
    "Новый пользователь — GPT STORE",
    `Новый пользователь\nEmail: ${user.email ?? "не указан"}\nTelegram: ${user.telegram_username ? "@" + user.telegram_username : "нет"}\nОткрыть: ${APP_URL}/admin/users`
  );
}

export async function notifyNewOrder(
  order: { id: string; plan_name?: string; price: number; account_email?: string },
  user: { email?: string | null }
) {
  const text = `🔔 <b>Новый заказ</b>
🛒 Тариф: ${order.plan_name ?? order.id}
💰 Сумма: ${order.price} ₽
📧 Клиент: ${user.email ?? "неизвестен"}
📧 ChatGPT: ${order.account_email ?? "не указан"}
🔗 <a href="${APP_URL}/admin/orders">Открыть заказ</a>`;
  await sendTelegramMessage(ADMIN_CHAT_ID, text);
  await sendSupportEmail(
    "🔔 Новый заказ — GPT STORE",
    `Новый заказ\nТариф: ${order.plan_name ?? order.id}\nСумма: ${order.price} ₽\nКлиент: ${user.email ?? "неизвестен"}\nChatGPT email: ${order.account_email ?? "не указан"}\nОткрыть: ${APP_URL}/admin/orders`
  );
}

export async function notifyCustomerOrderCreated(payload: {
  customerEmail: string;
  orderId: string;
  planName: string;
  price: number;
  accountEmail?: string;
}) {
  const text = `Здравствуйте!

Ваш заказ успешно создан.

Номер заказа: ${payload.orderId}
Тариф: ${payload.planName}
Сумма: ${payload.price} ₽
Email аккаунта ChatGPT: ${payload.accountEmail ?? "не указан"}

Статус заказа можно смотреть в личном кабинете:
${APP_URL}/dashboard/orders

Поддержка и шаги подключения — в чате на сайте GPT STORE (инструкцию по данным сессии мы не отправляем на email):
${APP_URL}/dashboard/chat`;

  await sendEmail(payload.customerEmail, "Заказ в GPT STORE создан", text);
}

const STATUS_NAMES: Record<string, string> = {
  paid: "Оплачен",
  activating: "В активации",
  active: "Активирован",
  failed: "Ошибка",
  refunded: "Возврат",
  waiting_client: "Ждём данные от клиента",
  pending: "Ожидает оплаты",
  expired: "Истёк",
};

function telegramTitleForStatus(status: string): string {
  if (status === "activating" || status === "paid") return "🔔 Оплата пришла";
  if (status === "active") return "🟢 Подписка активирована";
  if (status === "failed") return "❌ Ошибка оплаты / заказа";
  return "📋 Статус заказа";
}

export async function notifyPaymentStatus(
  order: { id: string; plan_name?: string; price: number; account_email?: string },
  status: string
) {
  const emoji =
    {
      paid: "✅",
      activating: "✅",
      active: "🟢",
      failed: "❌",
      refunded: "↩️",
      waiting_client: "⏳",
    }[status] ?? "📋";

  const label = STATUS_NAMES[status] ?? status;
  const title = telegramTitleForStatus(status);

  const text = `${emoji} <b>${title}</b>
📋 Заказ: ${order.id.slice(0, 8)}...
🛒 Тариф: ${order.plan_name ?? "неизвестен"}
💰 Сумма: ${order.price} ₽
📊 Статус: <b>${label}</b>
📧 ChatGPT: ${order.account_email ?? "не указан"}
🔗 <a href="${APP_URL}/admin/orders">Открыть в админке</a>`;
  await sendTelegramMessage(ADMIN_CHAT_ID, text);
  await sendSupportEmail(
    `${title} — ${label}`,
    `Заказ: ${order.id}\nТариф: ${order.plan_name ?? "неизвестен"}\nСумма: ${order.price} ₽\nСтатус: ${label}\nОткрыть: ${APP_URL}/admin/orders`
  );
}

export async function notifyCustomerOrderStatus(payload: {
  customerEmail: string;
  orderId: string;
  planName?: string;
  status: string;
  price: number;
}) {
  const statusLabel = STATUS_NAMES[payload.status] ?? payload.status;
  const reviewHint =
    payload.status === "active"
      ? `\nЕсли всё понравилось, пожалуйста, оставьте отзыв: ${APP_URL}/reviews`
      : "";

  const chatHint =
    payload.status === "active" || payload.status === "activating" || payload.status === "waiting_client"
      ? `\n\nВсе детали подключения — в чате сайта GPT STORE: ${APP_URL}/dashboard/chat`
      : "";

  const text = `Здравствуйте!

Статус вашего заказа обновился.

Номер заказа: ${payload.orderId}
Тариф: ${payload.planName ?? "Подписка ChatGPT"}
Сумма: ${payload.price} ₽
Текущий статус: ${statusLabel}

Проверить статус:
${APP_URL}/dashboard/orders
${reviewHint}${chatHint}

Если нужна помощь:
${APP_URL}/dashboard/chat`;

  const subject =
    payload.status === "active"
      ? "Подписка ChatGPT активирована — GPT STORE"
      : `Статус заказа: ${statusLabel} — GPT STORE`;

  await sendEmail(payload.customerEmail, subject, text);
}

export async function notifyNewMessage(
  sessionId: string,
  userEmail: string | null,
  messagePreview: string
) {
  const text = `🔔 <b>Клиент написал</b>
👤 Клиент: ${userEmail ?? "неизвестен"}
💬 "${messagePreview.slice(0, 100)}${messagePreview.length > 100 ? "..." : ""}"
🔗 <a href="${APP_URL}/admin/chat">Ответить в админке</a>`;
  await sendTelegramMessage(ADMIN_CHAT_ID, text);
  await sendSupportEmail(
    "🔔 Клиент написал в чат",
    `Новое сообщение клиента\nКлиент: ${userEmail ?? "неизвестен"}\nСообщение: ${messagePreview.slice(0, 200)}\nОтветить: ${APP_URL}/admin/chat`
  );
}

export async function notifyStaffAboutChatMessage(payload: {
  fromEmail: string | null;
  messagePreview: string;
  sessionId: string;
  recipients?: string[];
}) {
  const recipients = Array.from(
    new Set([...(payload.recipients ?? []), ...resolveStaffNotificationEmails()].map((x) => x.trim().toLowerCase()).filter(Boolean))
  );
  if (!recipients.length) return;

  const preview =
    payload.messagePreview.length > 200
      ? `${payload.messagePreview.slice(0, 200)}...`
      : payload.messagePreview;

  const subject = "Непрочитанное сообщение от клиента — GPT STORE";
  const text = `Поступило новое непрочитанное сообщение от клиента.

Отправитель: ${payload.fromEmail ?? "неизвестен"}
Сессия: ${payload.sessionId}
Сообщение: ${preview}

Открыть чат: ${APP_URL}/admin/chat`;

  await sendEmailMany(recipients, subject, text);
}

export async function notifyCustomerAboutChatMessage(payload: {
  customerEmail: string;
  senderRoleLabel: string;
  messagePreview: string;
  sessionId: string;
}) {
  const preview =
    payload.messagePreview.length > 200
      ? `${payload.messagePreview.slice(0, 200)}...`
      : payload.messagePreview;

  const subject = "У вас непрочитанное сообщение в чате — GPT STORE";
  const text = `Здравствуйте!

${payload.senderRoleLabel} отправил(а) вам новое сообщение в чате поддержки GPT STORE.

Сессия: ${payload.sessionId}
Сообщение: ${preview}

Ответить в чате:
${APP_URL}/dashboard/chat`;

  await sendEmail(payload.customerEmail, subject, text);
}

export async function notifyNewReview(review: {
  author_name?: string | null;
  content: string;
}) {
  const text = `⭐ <b>Новый отзыв на модерации</b>
👤 Автор: ${review.author_name ?? "Аноним"}
💬 "${review.content.slice(0, 150)}..."
🔗 <a href="${APP_URL}/admin/reviews">Модерировать</a>`;
  await sendTelegramMessage(ADMIN_CHAT_ID, text);
  await sendSupportEmail(
    "Новый отзыв на модерации",
    `Новый отзыв\nАвтор: ${review.author_name ?? "Аноним"}\nТекст: ${review.content.slice(0, 200)}\nОткрыть: ${APP_URL}/admin/reviews`
  );
}

export async function notifyDelayedSession(sessionId: string, delayMinutes: number) {
  const text = `🚨 <b>Нет ответа оператора</b>
📋 Сессия: ${sessionId}
⏱ Ожидание: ${delayMinutes} мин
🔗 <a href="${APP_URL}/admin/chat">Открыть чат</a>`;
  await sendTelegramMessage(ADMIN_CHAT_ID, text);
  await sendSupportEmail(
    "Нет ответа оператора",
    `Сессия без ответа оператора\nСессия: ${sessionId}\nОжидание: ${delayMinutes} мин\nОткрыть: ${APP_URL}/admin/chat`
  );
}

/** Ошибки оплаты / обработки заказа (без чувствительных данных в тексте). */
export async function notifyOperationalFailure(payload: { context: string; detail?: string }) {
  const safeDetail = payload.detail ? payload.detail.slice(0, 500) : "";
  const text = `⚠️ <b>Ошибка в работе сервиса</b>
📌 ${payload.context}
${safeDetail ? `\n<i>${safeDetail.replace(/</g, "")}</i>` : ""}
🔗 <a href="${APP_URL}/admin/orders">Админка</a>`;
  await sendTelegramMessage(ADMIN_CHAT_ID, text);
  await sendSupportEmail(
    `Ошибка: ${payload.context}`,
    `${payload.context}\n${safeDetail}\n${APP_URL}/admin/orders`
  );
}

/** Смена статуса заказа вручную из админки. */
export async function notifyManualOrderStatusChange(order: {
  id: string;
  plan_name?: string | null;
  plan_id?: string;
  price: number;
  account_email?: string | null;
  prev: string;
  next: string;
}) {
  const labelPrev = STATUS_NAMES[order.prev] ?? order.prev;
  const labelNext = STATUS_NAMES[order.next] ?? order.next;
  const plan = order.plan_name ?? order.plan_id ?? "—";
  const text = `🔔 <b>Статус заказа изменён вручную</b>
📋 Заказ: ${order.id.slice(0, 8)}...
🛒 Тариф: ${plan}
💰 Сумма: ${order.price} ₽
↔️ ${labelPrev} → <b>${labelNext}</b>
📧 ChatGPT: ${order.account_email ?? "не указан"}
🔗 <a href="${APP_URL}/admin/orders">Открыть</a>`;
  await sendTelegramMessage(ADMIN_CHAT_ID, text);
  await sendSupportEmail(
    `Статус заказа вручную: ${labelNext}`,
    `Заказ: ${order.id}\nТариф: ${plan}\nБыло: ${labelPrev}\nСтало: ${labelNext}\n${APP_URL}/admin/orders`
  );
}

export async function notifyDailyAdminDigest(stats: {
  dateLabel: string;
  ordersToday: number;
  revenueToday: number;
  newClientsToday: number;
  revenue7d: number;
  revenueMonth: number;
}) {
  const text = `📊 <b>Итоги дня (${stats.dateLabel})</b>
🛒 Заказов сегодня: ${stats.ordersToday}
💰 Выручка сегодня: ${stats.revenueToday.toLocaleString("ru")} ₽
👤 Новых клиентов: ${stats.newClientsToday}
📈 Выручка 7 дней: ${stats.revenue7d.toLocaleString("ru")} ₽
📆 Выручка месяца: ${stats.revenueMonth.toLocaleString("ru")} ₽
🔗 <a href="${APP_URL}/admin">Панель</a>`;
  await sendTelegramMessage(ADMIN_CHAT_ID, text);
  await sendSupportEmail(
    `Сводка GPT STORE за ${stats.dateLabel}`,
    `Заказов сегодня: ${stats.ordersToday}\nВыручка сегодня: ${stats.revenueToday} ₽\nНовых клиентов: ${stats.newClientsToday}\nВыручка 7 дней: ${stats.revenue7d} ₽\nВыручка месяца: ${stats.revenueMonth} ₽\n${APP_URL}/admin`
  );
}
