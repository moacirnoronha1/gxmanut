import { createFileRoute } from "@tanstack/react-router";

async function executar(request: Request) {
  const apikey = request.headers.get("apikey") ?? request.headers.get("x-api-key");
  const esperado = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
  if (!apikey || !esperado || apikey !== esperado) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const { rodarRotinasNotificacao } = await import("@/lib/push.server");
  try {
    const resultado = await rodarRotinasNotificacao();
    return new Response(JSON.stringify({ ok: true, ...resultado }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/public/hooks/notificacoes")({
  server: {
    handlers: {
      POST: ({ request }) => executar(request),
      GET: ({ request }) => executar(request),
    },
  },
});
