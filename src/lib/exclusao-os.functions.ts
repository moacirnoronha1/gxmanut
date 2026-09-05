import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const USER_DOMAIN = "xica.local";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertMestre(userId: string) {
  const db = await admin();
  const { data, error } = await db
    .from("profiles")
    .select("is_master, username, email, nome")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.is_master) throw new Error("Apenas o Usuário Mestre pode decidir sobre exclusões de OS.");
  return data;
}

async function conferirSenha(email: string, senha: string) {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const { createClient } = await import("@supabase/supabase-js");
  const authClient = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { error } = await authClient.auth.signInWithPassword({ email, password: senha });
  if (error) throw new Error("Senha do Usuário Mestre incorreta.");
}

/** Qualquer usuário autenticado pode SOLICITAR a exclusão definitiva de uma OS. */
export const solicitarExclusaoOS = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        os_id: z.string().uuid(),
        motivo: z.string().trim().min(5, "Descreva o motivo da exclusão (mínimo 5 caracteres)."),
        observacao: z.string().trim().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: os } = await db
      .from("ordens_servico")
      .select("id, numero, titulo")
      .eq("id", data.os_id)
      .maybeSingle();
    if (!os) throw new Error("Ordem de serviço não encontrada.");

    const { data: pendente } = await db
      .from("os_exclusao_solicitacoes" as never)
      .select("id")
      .eq("os_id", data.os_id)
      .eq("status", "pendente")
      .maybeSingle();
    if (pendente) throw new Error("Já existe uma solicitação de exclusão pendente para esta OS.");

    const { error } = await db.from("os_exclusao_solicitacoes" as never).insert({
      os_id: data.os_id,
      os_numero: os.numero,
      solicitado_por: context.userId,
      motivo: data.motivo,
      observacao: data.observacao || null,
    } as never);
    if (error) throw new Error(error.message);

    const { data: autor } = await db
      .from("profiles")
      .select("nome, nome_completo, username")
      .eq("id", context.userId)
      .maybeSingle();
    const quem = autor?.nome_completo || autor?.nome || autor?.username || "Um usuário";

    const { data: mestres } = await db.from("profiles").select("id").eq("is_master", true);
    if (mestres?.length) {
      await db.from("notificacoes").insert(
        mestres.map((m) => ({
          user_id: m.id,
          tipo: "aprovacao",
          prioridade: "urgente",
          titulo: `Exclusão da OS #${os.numero} aguardando aprovação`,
          mensagem: `${quem} solicitou a exclusão definitiva da OS #${os.numero} — ${os.titulo}. Motivo: ${data.motivo}`,
          url: "/exclusoes",
          os_id: os.id,
        })) as never,
      );
    }

    await db.from("usuarios_auditoria").insert({
      ator_id: context.userId,
      alvo_id: context.userId,
      acao: "os_exclusao_solicitada",
      detalhes: { os_id: os.id, numero: os.numero, motivo: data.motivo } as never,
    });

    return { ok: true };
  });

/** Aprovação + exclusão definitiva — somente Usuário Mestre, com senha. */
export const aprovarExclusaoOS = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        solicitacao_id: z.string().uuid(),
        senha: z.string().min(1, "Informe a senha do Usuário Mestre."),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const mestre = await assertMestre(context.userId);
    const email = mestre.email ?? `${(mestre.username ?? "").toLowerCase()}@${USER_DOMAIN}`;
    await conferirSenha(email, data.senha);

    const db = await admin();
    const { data: sol } = await db
      .from("os_exclusao_solicitacoes" as never)
      .select("id, os_id, os_numero, status, motivo, solicitado_por")
      .eq("id", data.solicitacao_id)
      .maybeSingle();
    const pedido = sol as unknown as {
      id: string;
      os_id: string;
      os_numero: number | null;
      status: string;
      motivo: string;
      solicitado_por: string | null;
    } | null;
    if (!pedido || pedido.status !== "pendente") throw new Error("Solicitação não encontrada ou já decidida.");
    const osId = pedido.os_id;

    // Registros exclusivos da OS (checklists não são vinculados diretamente à OS)

    const { data: custos } = await db.from("os_custos").select("id").eq("os_id", osId);
    if (custos?.length) {
      await db
        .from("os_custo_evidencias")
        .delete()
        .in("custo_id", custos.map((c) => c.id));
    }
    // Movimentações de estoque permanecem (peça do cadastro geral), apenas o vínculo é removido.
    await db.from("estoque_movimentacoes").update({ os_id: null, os_custo_id: null }).eq("os_id", osId);
    await db.from("os_custos").delete().eq("os_id", osId);
    await db.from("os_anexos").delete().eq("os_id", osId);
    await db.from("os_comentarios").delete().eq("os_id", osId);
    await db.from("os_historico").delete().eq("os_id", osId);
    await db.from("os_tecnicos").delete().eq("os_id", osId);
    await db.from("equipamento_historico").delete().eq("os_id", osId);
    await db.from("estoque_reservas").delete().eq("os_id", osId);
    await db.from("notificacoes").delete().eq("os_id", osId);
    await db.from("mp_execucoes").update({ os_id: null }).eq("os_id", osId);
    await db.from("ordens_servico").update({ reaberta_de: null }).eq("reaberta_de", osId);

    await db
      .from("os_exclusao_solicitacoes" as never)
      .update({ status: "aprovada", decidido_por: context.userId, decidido_em: new Date().toISOString() } as never)
      .eq("id", pedido.id);

    const { error } = await db.from("ordens_servico").delete().eq("id", osId);
    if (error) throw new Error(error.message);

    if (pedido.solicitado_por) {
      await db.from("notificacoes").insert({
        user_id: pedido.solicitado_por,
        tipo: "aprovacao",
        prioridade: "normal",
        titulo: `Exclusão da OS #${pedido.os_numero} aprovada`,
        mensagem: "O Usuário Mestre aprovou e a OS foi excluída definitivamente.",
        url: "/ordens",
      } as never);
    }

    await db.from("usuarios_auditoria").insert({
      ator_id: context.userId,
      alvo_id: pedido.solicitado_por ?? context.userId,
      acao: "os_excluida_definitivamente",
      detalhes: { os_id: osId, numero: pedido.os_numero, motivo: pedido.motivo } as never,
    });

    return { ok: true, numero: pedido.os_numero };
  });

/** Rejeição da solicitação — somente Usuário Mestre. */
export const rejeitarExclusaoOS = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        solicitacao_id: z.string().uuid(),
        motivo: z.string().trim().min(3, "Informe o motivo da rejeição."),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertMestre(context.userId);
    const db = await admin();
    const { data: sol } = await db
      .from("os_exclusao_solicitacoes" as never)
      .select("id, os_id, os_numero, status, solicitado_por")
      .eq("id", data.solicitacao_id)
      .maybeSingle();
    const pedido = sol as unknown as {
      id: string;
      os_id: string;
      os_numero: number | null;
      status: string;
      solicitado_por: string | null;
    } | null;
    if (!pedido || pedido.status !== "pendente") throw new Error("Solicitação não encontrada ou já decidida.");

    const { error } = await db
      .from("os_exclusao_solicitacoes" as never)
      .update({
        status: "rejeitada",
        decidido_por: context.userId,
        decidido_em: new Date().toISOString(),
        motivo_rejeicao: data.motivo,
      } as never)
      .eq("id", pedido.id);
    if (error) throw new Error(error.message);

    await db.from("os_historico").insert({
      os_id: pedido.os_id,
      usuario_id: context.userId,
      acao: "Solicitação de exclusão rejeitada",
      detalhes: { motivo: data.motivo } as never,
    });

    if (pedido.solicitado_por) {
      await db.from("notificacoes").insert({
        user_id: pedido.solicitado_por,
        tipo: "aprovacao",
        prioridade: "normal",
        titulo: `Exclusão da OS #${pedido.os_numero} rejeitada`,
        mensagem: `O Usuário Mestre rejeitou a exclusão. Motivo: ${data.motivo}`,
        url: `/ordens`,
        os_id: pedido.os_id,
      } as never);
    }

    return { ok: true };
  });
