export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { accountLabEnabled } from "@/lib/account/config";
import AccountLab from "./ui";
export default function Page() {
  if (!accountLabEnabled()) notFound();
  return <AccountLab />;
}
