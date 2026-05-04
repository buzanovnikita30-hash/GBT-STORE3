"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ChevronDown, CheckCircle2, ExternalLink, MessageCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CHATGPT_SESSION_URL, SESSION_INSTRUCTION_STEPS } from "@/lib/copy/session-instruction";

const FACTS = [
  {
    title: "Зачем нужны данные сессии",
    body: "Иногда для подключения подписки ChatGPT на ваш аккаунт нужны данные сессии из браузера. Без них технически нельзя завершить привязку подписки.",
  },
  {
    title: "Куда отправлять",
    body: "Такие данные могут фактически открывать доступ к сессии аккаунта, поэтому передавайте их только в официальный чат сайта GPT STORE — не в мессенджеры и не на сторонние адреса.",
  },
  {
    title: "После подключения",
    body: "Когда подписка подключена, вы можете завершить активные сессии или обновить настройки безопасности в ChatGPT. Пароль мы не запрашиваем.",
  },
];

interface Props {
  compact?: boolean;
  onSendToken?: () => void;
  className?: string;
  /** Показать кнопку «Написать в поддержку» (чат сайта) */
  showSupportLink?: boolean;
  supportHref?: string;
}

export function TokenSafetyBlock({
  compact = false,
  onSendToken,
  className,
  showSupportLink = true,
  supportHref = "/dashboard/chat",
}: Props) {
  const [isOpen, setIsOpen] = useState(!compact);
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(CHATGPT_SESSION_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={cn("rounded-2xl border border-black/[0.08] bg-white", className)}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4"
      >
        <div className="flex items-center gap-2.5">
          <Lock size={16} className="shrink-0 text-[#10a37f]" />
          <span className="text-sm font-semibold text-gray-800">Как работает подключение</span>
        </div>
        <ChevronDown
          size={16}
          className={cn("shrink-0 text-gray-400 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-black/[0.06] px-5 pb-5 pt-4 space-y-5">
              <p className="text-sm text-gray-600 leading-relaxed">
                Для части сценариев подключения нужны{" "}
                <span className="font-semibold text-gray-800">данные сессии</span> аккаунта ChatGPT. Это{" "}
                <span className="font-semibold">не пароль</span>, но такие данные могут давать доступ к сессии
                аккаунта — относитесь к ним внимательно и отправляйте только в чат сайта GPT STORE.
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                {FACTS.map((fact) => (
                  <div
                    key={fact.title}
                    className="rounded-xl border border-black/[0.06] bg-gray-50 p-3"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Lock size={13} className="text-[#10a37f]" />
                      <span className="text-xs font-semibold text-gray-800">{fact.title}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{fact.body}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold text-gray-800">
                  Следуйте, пожалуйста, инструкции:
                </p>
                <ol className="space-y-3">
                  {SESSION_INSTRUCTION_STEPS.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#10a37f]/10 text-[10px] font-bold text-[#10a37f]">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1 text-sm text-gray-600">
                        <p>{step}</p>
                        {i === 2 && (
                          <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:items-center">
                            <button
                              type="button"
                              onClick={() => void copyUrl()}
                              className="inline-flex w-full max-w-full items-center justify-center break-all rounded-lg border border-[#10a37f]/35 bg-[#10a37f]/6 px-3 py-2 text-left font-mono text-[12px] font-medium text-[#0f7d62] hover:bg-[#10a37f]/12 sm:w-auto"
                              title="Скопировать ссылку"
                            >
                              {CHATGPT_SESSION_URL}
                            </button>
                            {copied ? (
                              <span className="text-xs font-medium text-[#10a37f]">Скопировано</span>
                            ) : (
                              <span className="text-xs text-gray-400">Нажмите, чтобы скопировать</span>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>

                {process.env.NEXT_PUBLIC_TOKEN_INSTRUCTION_VIDEO_URL && (
                  <a
                    href={process.env.NEXT_PUBLIC_TOKEN_INSTRUCTION_VIDEO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-[#10a37f] hover:underline"
                  >
                    <ExternalLink size={13} />
                    Посмотреть видео-инструкцию
                  </a>
                )}
              </div>

              {showSupportLink && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Link
                    href={supportHref}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#10a37f]/40 bg-[#10a37f]/8 px-4 py-2.5 text-sm font-semibold text-[#0f7d62] transition-colors hover:bg-[#10a37f]/15"
                  >
                    <MessageCircle size={16} />
                    Написать в поддержку
                  </Link>
                  <span className="text-xs text-gray-500 sm:pl-2">
                    Откроется чат сайта — туда же отправляйте данные по инструкции.
                  </span>
                </div>
              )}

              <p className="rounded-xl bg-amber-50 border border-amber-200/60 px-4 py-3 text-xs text-amber-800 leading-relaxed">
                Мы не запрашиваем пароль. Инструкцию и ответы по подключению вы получаете на сайте и в чате GPT
                STORE — не ищите её в письмах на email: там будут только статусы заказа и короткие уведомления.
              </p>

              {onSendToken && (
                <button
                  type="button"
                  onClick={onSendToken}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#10a37f] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <CheckCircle2 size={15} />
                  Открыть чат и отправить данные
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
