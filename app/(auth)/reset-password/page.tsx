import type { Metadata } from "next";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Сброс пароля" };

type ResetPasswordPageProps = {
  searchParams?: { error?: string };
};

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  return (
    <div className="w-full max-w-sm">
      <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">Сброс пароля</h1>
      <p className="text-sm text-gray-500 mb-8">
        Введите email — пришлём ссылку для сброса пароля.
      </p>
      <ResetPasswordForm callbackError={searchParams?.error} />
    </div>
  );
}
