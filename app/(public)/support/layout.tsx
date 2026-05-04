import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Поддержка",
  description: "Чат поддержки GPT STORE: вопросы по ChatGPT 5.5 и ChatGPT 5.5 Pro",
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
