import DesktopPreviewClient from "./DesktopPreviewClient";

// The permanent preview URL must fetch the current deployment on every reload.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function DesktopPreviewPage() {
  return <DesktopPreviewClient />;
}
