"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Check } from "lucide-react";
import { profileUpdateSchema, type ProfileUpdateInput } from "@/lib/validations";
import { cn } from "@/lib/utils";

function formatAccountCreated(iso: string): string | null {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface Props {
  initialData: {
    username: string;
    telegram_username: string;
    email: string;
    createdAt: string;
  };
}

export function ProfileForm({ initialData }: Props) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const accountCreatedLabel = formatAccountCreated(initialData.createdAt);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<ProfileUpdateInput>({
      resolver: zodResolver(profileUpdateSchema),
      defaultValues: {
        username: initialData.username,
        telegram_username: initialData.telegram_username,
      },
    });

  async function onSubmit(data: ProfileUpdateInput) {
    setError(null);
    const res = await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = (await res.json()) as { error?: string };

    if (!res.ok) {
      setError(json.error ?? "Не удалось сохранить профиль");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);

    if (newPassword.length < 8) {
      setPasswordError("Новый пароль должен быть не короче 8 символов.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("Пароли не совпадают.");
      return;
    }

    setPasswordSubmitting(true);
    const res = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword, confirmPassword: confirmNewPassword }),
    });
    const json = (await res.json()) as { error?: string };
    setPasswordSubmitting(false);

    if (!res.ok) {
      setPasswordError(json.error ?? "Не удалось обновить пароль.");
      return;
    }

    setNewPassword("");
    setConfirmNewPassword("");
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 4000);
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input
            type="email"
            value={initialData.email}
            disabled
            className="w-full rounded-xl border border-black/[0.1] bg-gray-50 px-3.5 py-2.5 text-sm text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Имя</label>
          <input
            type="text"
            {...register("username")}
            className={cn(
              "w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-shadow",
              "focus:ring-2 focus:ring-[#10a37f]/30 focus:border-[#10a37f]",
              errors.username ? "border-red-400" : "border-black/[0.12]"
            )}
            placeholder="Ваше имя"
          />
          {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Telegram @username</label>
          <input
            type="text"
            {...register("telegram_username")}
            className={cn(
              "w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-shadow",
              "focus:ring-2 focus:ring-[#10a37f]/30 focus:border-[#10a37f]",
              "border-black/[0.12]"
            )}
            placeholder="@username"
          />
        </div>

        {accountCreatedLabel && (
          <p className="text-xs text-gray-400">Аккаунт создан: {accountCreatedLabel}</p>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#10a37f] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          {saved && <Check size={14} />}
          {saved ? "Сохранено!" : "Сохранить"}
        </button>
      </form>

      <form onSubmit={onPasswordSubmit} className="space-y-4 border-t border-black/[0.08] pt-6">
        <h2 className="font-heading text-lg font-semibold text-gray-900">Сменить пароль</h2>
        <p className="text-sm text-gray-500">
          После смены пароля вход будет работать только с новым паролем.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Новый пароль</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-xl border border-black/[0.12] px-3.5 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[#10a37f]/30 focus:border-[#10a37f]"
            placeholder="Минимум 8 символов"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Повторите новый пароль</label>
          <input
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            className="w-full rounded-xl border border-black/[0.12] px-3.5 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[#10a37f]/30 focus:border-[#10a37f]"
            placeholder="••••••••"
          />
        </div>

        {passwordError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{passwordError}</p>
        )}
        {passwordSaved && (
          <p className="rounded-lg border border-[#10a37f]/30 bg-[#10a37f]/10 px-3 py-2 text-sm text-[#0f766e]">
            Пароль успешно обновлён.
          </p>
        )}

        <button
          type="submit"
          disabled={passwordSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#10a37f] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {passwordSubmitting && <Loader2 size={14} className="animate-spin" />}
          Обновить пароль
        </button>
      </form>
    </div>
  );
}
