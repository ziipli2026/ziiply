export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { accountLabEnabled } from "@/lib/account/config";
import DesktopPreview from "./client";
export default function Page() {
  if (!accountLabEnabled()) notFound();
  return <><DesktopPreview /><Link href="/account-lab" className="fixed bottom-1 right-2 z-[200] rounded bg-white px-3 py-1 text-sm text-black">Käyttäjätilin kehitystesti</Link></>;
}
