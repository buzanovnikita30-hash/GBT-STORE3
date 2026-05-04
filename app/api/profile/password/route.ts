import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
    }

    const body = (await request.json()) as { password?: string; confirmPassword?: string };
    const password = (body.password ?? "").trim();
    const confirmPassword = (body.confirmPassword ?? "").trim();

    if (password.length < 8) {
      return NextResponse.json({ error: "Пароль должен быть не короче 8 символов." }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Пароли не совпадают." }, { status: 400 });
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return NextResponse.json({ error: "Не удалось обновить пароль." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка обновления пароля" },
      { status: 500 }
    );
  }
}

