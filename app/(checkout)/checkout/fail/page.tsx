import type { Metadata } from "next";
import { XCircle } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Ошибка оплаты" };

export default function CheckoutFailPage() {
  return (
    <div className="w-full max-w-sm text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <XCircle size={28} className="text-red-400" />
      </div>
      <h1 className="font-heading text-2xl font-bold text-gray-900 mb-3">Оплата не прошла</h1>
      <p className="text-sm text-gray-500 mb-6">
        Что-то пошло не так во время проведения платежа. Попробуйте еще раз чуть позже.
      </p>
      <div className="space-y-2">
        <Link href="/checkout" className="block w-full rounded-xl bg-[#10a37f] py-3 text-sm font-semibold text-white text-center hover:opacity-90">
          Попробовать снова
        </Link>
        <a href="https://t.me/subs_support" target="_blank" rel="noopener noreferrer"
          className="block w-full rounded-xl border border-black/[0.1] py-3 text-sm text-gray-600 text-center hover:bg-gray-50">
          Написать в поддержку
        </a>
      </div>
    </div>
  );
}
