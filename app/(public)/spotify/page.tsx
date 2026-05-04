import type { Metadata } from "next";
import Link from "next/link";
import { LandingFooter } from "@/components/layout/LandingFooter";
import { ChatGptLandingNav } from "@/components/sections/ChatGptLandingNav";
import { ChatWidget } from "@/components/sections/ChatWidget";

export const metadata: Metadata = {
  title: "Spotify Premium без иностранной карты",
  description:
    "Подключаем Spotify Premium на ваш аккаунт. Оплата картой РФ, активация за 5 минут, гарантия на весь срок.",
};

const PLANS = [
  {
    name: "1 месяц",
    price: "199",
    period: "мес",
    features: [
      "Без рекламы",
      "Скачивание треков офлайн",
      "Высокое качество звука",
      "Неограниченные пропуски",
    ],
    isPopular: false,
    cta: "Подключить",
  },
  {
    name: "3 месяца",
    price: "549",
    period: "3 мес",
    features: [
      "Без рекламы",
      "Скачивание треков офлайн",
      "Высокое качество звука",
      "Неограниченные пропуски",
      "Выгода 8%",
    ],
    isPopular: true,
    cta: "Подключить",
  },
  {
    name: "12 месяцев",
    price: "1 990",
    period: "год",
    features: [
      "Без рекламы",
      "Скачивание треков офлайн",
      "Высокое качество звука",
      "Неограниченные пропуски",
      "Выгода 17%",
    ],
    isPopular: false,
    cta: "Подключить",
  },
];

const STEPS = [
  { num: "1", title: "Выбираете тариф", desc: "Выбираете подходящий план и переходите к оформлению" },
  { num: "2", title: "Оплачиваете", desc: "Оплата через Pally, СБП или банковскую карту РФ — без иностранной карты" },
  { num: "3", title: "Мы активируем", desc: "Наш специалист активирует Premium на вашем аккаунте за 5 минут" },
];

export default function SpotifyPage() {
  return (
    <>
      <div className="relative text-gray-900">
        <div className="relative z-10">
          <ChatGptLandingNav />

          <main className="pt-14">
            {/* Hero */}
            <section className="relative overflow-hidden py-20 md:py-28">
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(29,185,84,0.08) 0%, transparent 60%)",
                }}
              />
              <div className="relative z-10 mx-auto max-w-4xl px-4 text-center md:px-6">
                <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1db954]/10">
                  <svg viewBox="0 0 24 24" fill="#1db954" className="h-9 w-9">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                </div>
                <span className="mb-4 inline-flex items-center rounded-full border border-[#1db954]/20 bg-[#1db954]/8 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#1db954]">
                  Spotify Premium
                </span>
                <h1 className="mt-3 font-heading text-4xl font-bold text-gray-900 md:text-5xl">
                  Spotify Premium
                  <br />
                  <span style={{ color: "#1db954" }}>без иностранной карты</span>
                </h1>
                <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-500">
                  Активируем Spotify Premium на ваш аккаунт. Оплата картой РФ или СБП, активация за 5 минут, гарантия на весь срок.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <a
                    href="#pricing"
                    className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold text-white shadow-lg"
                    style={{ background: "#1db954", boxShadow: "0 8px 30px rgba(29,185,84,0.3)" }}
                  >
                    Выбрать тариф
                  </a>
                  <a
                    href="/support"
                    className="inline-flex items-center gap-2 rounded-xl border border-black/[0.1] px-8 py-3.5 text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Задать вопрос
                  </a>
                </div>

                {/* Trust badges */}
                <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
                  {["✅ Оплата картой РФ", "⚡ Активация за 5 минут", "🛡️ Гарантия 30 дней", "🔒 Без вашего пароля"].map(
                    (b) => (
                      <span key={b} className="rounded-full bg-gray-100 px-4 py-1.5 font-medium">
                        {b}
                      </span>
                    )
                  )}
                </div>
              </div>
            </section>

            {/* How it works */}
            <section className="bg-gray-50/60 py-16">
              <div className="mx-auto max-w-4xl px-4 md:px-6">
                <h2 className="mb-10 text-center font-heading text-2xl font-bold text-gray-900">
                  Как это работает
                </h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {STEPS.map((step) => (
                    <div
                      key={step.num}
                      className="flex flex-col items-start gap-3 rounded-2xl border border-black/[0.06] bg-white p-5"
                    >
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
                        style={{ background: "#1db954" }}
                      >
                        {step.num}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{step.title}</p>
                        <p className="mt-1 text-sm text-gray-500">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="py-20">
              <div className="mx-auto max-w-4xl px-4 md:px-6">
                <div className="mb-10 text-center">
                  <span className="inline-flex items-center rounded-full border border-[#1db954]/20 bg-[#1db954]/8 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#1db954]">
                    Тарифы
                  </span>
                  <h2 className="mt-3 font-heading text-3xl font-bold text-gray-900">
                    Выберите срок подписки
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  {PLANS.map((plan) => (
                    <div
                      key={plan.name}
                      className="relative flex flex-col rounded-2xl bg-white p-6"
                      style={
                        plan.isPopular
                          ? {
                              border: "1.5px solid #1db954",
                              boxShadow: "0 0 0 4px rgba(29,185,84,0.1)",
                            }
                          : { border: "1px solid rgba(0,0,0,0.08)" }
                      }
                    >
                      {plan.isPopular && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                          <span className="rounded-full bg-[#1db954] px-4 py-1 text-xs font-bold text-white">
                            Популярный
                          </span>
                        </div>
                      )}

                      <p className="mb-2 text-sm font-semibold text-gray-700">{plan.name}</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-heading text-4xl font-bold text-gray-900">{plan.price}</span>
                        <span className="text-lg text-gray-400">₽</span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">/ {plan.period}</p>

                      <ul className="mb-6 mt-5 flex-1 space-y-2">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#1db954]/10">
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                <path d="M1.5 4l2 2 3-3" stroke="#1db954" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </span>
                            {f}
                          </li>
                        ))}
                      </ul>

                      <a
                        href="/support"
                        className="flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold transition-all"
                        style={
                          plan.isPopular
                            ? { background: "#1db954", color: "white" }
                            : { border: "1.5px solid rgba(0,0,0,0.12)", color: "#374151" }
                        }
                      >
                        {plan.cta}
                      </a>
                    </div>
                  ))}
                </div>

                <p className="mt-8 text-center text-sm text-gray-400">
                  Оплата через Pally · СБП · Карта РФ · Без иностранной карты
                </p>
              </div>
            </section>

            {/* Cross-sell ChatGPT */}
            <section className="bg-gray-50/60 px-4 py-12 md:px-6">
              <div className="mx-auto max-w-4xl">
                <div className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-black/[0.08] bg-white p-6 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#10a37f]/10">
                      <svg viewBox="0 0 41 41" fill="none" className="h-7 w-7">
                        <path
                          d="M37.532 16.87a9.963 9.963 0 00-.856-8.184 10.078 10.078 0 00-10.855-4.835 9.964 9.964 0 00-7.505-3.337 10.078 10.078 0 00-9.612 6.923 9.967 9.967 0 00-6.664 4.834 10.079 10.079 0 001.24 11.817 9.965 9.965 0 00.856 8.185 10.079 10.079 0 0010.855 4.835 9.965 9.965 0 007.504 3.336 10.078 10.078 0 009.617-6.981 9.967 9.967 0 006.663-4.834 10.079 10.079 0 00-1.243-11.759z"
                          fill="#10a37f"
                        />
                        <path
                          d="M23.405 8.003a5.858 5.858 0 00-3.756 1.354l-7.36 6.173a5.856 5.856 0 00-2.033 4.46v7.875a5.858 5.858 0 001.69 4.124 5.858 5.858 0 004.124 1.69h.332l7.36 6.173a5.842 5.842 0 003.756 1.354 5.871 5.871 0 005.871-5.872v-21.46a5.87 5.87 0 00-9.984-3.871z"
                          fill="white"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Также подключаем</p>
                      <h3 className="font-heading text-lg font-bold text-gray-900">ChatGPT Plus</h3>
                      <p className="text-sm text-gray-500">ChatGPT 5.5, DALL·E 3, анализ файлов — оплата картой РФ</p>
                    </div>
                  </div>
                  <Link
                    href="/"
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                    style={{ background: "#10a37f" }}
                  >
                    Посмотреть тарифы
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </section>
          </main>

          <LandingFooter />
          <ChatWidget />
        </div>
      </div>
    </>
  );
}
