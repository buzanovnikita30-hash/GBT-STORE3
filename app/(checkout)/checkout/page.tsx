import type { Metadata } from "next";
import { CheckoutFlow } from "./CheckoutFlow";
import { getStoreConfig } from "@/lib/store-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = { title: "Оформление заказа" };

export default async function CheckoutPage() {
  const storeConfig = await getStoreConfig();
  return <CheckoutFlow initialPlans={storeConfig.plans} />;
}
