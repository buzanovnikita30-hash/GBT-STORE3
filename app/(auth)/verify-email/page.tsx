import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { VerifyEmailClient } from "./VerifyEmailClient";

export const metadata: Metadata = { title: "Подтвердите email" };

function Fallback() {
  return (
    <div className="flex w-full max-w-sm justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-[#10a37f]" />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <VerifyEmailClient />
    </Suspense>
  );
}
