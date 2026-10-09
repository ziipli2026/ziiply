import { getAccountAuth } from "@/lib/account/auth";
import { accountLabEnabled } from "@/lib/account/config";
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  if (!accountLabEnabled()) return new Response(null, { status: 404 });
  try {
    const handlers = getAccountAuth().handler();
    const method = request.method as keyof typeof handlers;
    return await handlers[method](request, context);
  } catch {
    return Response.json({ error: "Authentication unavailable" }, { status: 503 });
  }
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE, handle as PATCH };
