import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const USER_DOMAIN = "xica.local";

async function assertMestre(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("is_master, username, email")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.is_master) throw new Error("Apenas o Usuário Mestre pode excluir equipamentos definitivamente.");
  return data;
}

/** Conta todos os registros vinculados ao equipamento (para o aviso de exclusão). */
export const contarVinculosEquipamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ equipamento_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertMestre(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = data.equipamento_id;

    const count = async (table: string, coluna: string) => {
      const { count: n } = await supabaseAdmin
        .from(table as never)
        .select("id", { count: "exact", head: true })
        .eq(coluna, id);
      return n ?? 0;
    };

    const { data: eq } = await supabaseAdmin
      .from("equipamentos")
      .select("id, nome, codigo, patrimonio, foto_url")
      .eq("id", id)
      .maybeSingle();
    if (!eq) throw new Error("Equipamento não encontrado.");

    const [ordens, custos, manutencoes, planos, historico, documentos, paradas] = await Promise.all([
      count("ordens_servico", "equipamento_id"),
      count("os_custos", "equipamento_id"),
      count("manutencoes_periodicas", "equipamento_id"),
      count("planos_preventivos", "equipamento_id"),
      count("equipamento_historico", "equipamento_id"),
      count("equipamento_documentos", "equipamento_id"),
      count("equipamento_paradas", "equipamento_id"),
    ]);

    return {
      equipamento: eq,
      vinculos: { ordens, custos, manutencoes, planos, historico, documentos, paradas, fotos: eq.foto_url ? 1 : 0 },
      total: ordens + custos + manutencoes + planos + historico + documentos + paradas,
    };
  });

/** Exclusão definitiva — somente Usuário Mestre, com senha e motivo. */
export const excluirEquipamentoDefinitivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        equipamento_id: z.string().uuid(),
        senha: z.string().min(1, "Informe a senha do Usuário Mestre."),
        motivo: z.string().trim().min(5, "Descreva o motivo da exclusão (mínimo 5 caracteres)."),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const mestre = await assertMestre(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = data.equipamento_id;

    // Reconfirma a senha do Usuário Mestre.
    const email = mestre.email ?? `${(mestre.username ?? "").toLowerCase()}@${USER_DOMAIN}`;
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
    const { error: senhaErro } = await authClient.auth.signInWithPassword({ email, password: data.senha });
    if (senhaErro) throw new Error("Senha do Usuário Mestre incorreta.");

    const { data: eq } = await supabaseAdmin
      .from("equipamentos")
      .select("id, nome, codigo, patrimonio, setor_id, valor_aquisicao")
      .eq("id", id)
      .maybeSingle();
    if (!eq) throw new Error("Equipamento não encontrado.");

    const rotulo = [eq.nome, eq.codigo, eq.patrimonio].filter(Boolean).join(" · ");

    // Preserva as OS: desvincula mantendo o nome do equipamento excluído.
    await supabaseAdmin
      .from("ordens_servico")
      .update({ equipamento_id: null, equipamento_nao_cadastrado: rotulo })
      .eq("equipamento_id", id);
    await supabaseAdmin.from("os_custos").update({ equipamento_id: null }).eq("equipamento_id", id);
    await supabaseAdmin.from("manutencoes_periodicas").update({ equipamento_id: null }).eq("equipamento_id", id);

    // Remove registros exclusivos do equipamento.
    await supabaseAdmin.from("planos_preventivos").delete().eq("equipamento_id", id);
    await supabaseAdmin.from("equipamento_documentos").delete().eq("equipamento_id", id);
    await supabaseAdmin.from("equipamento_paradas").delete().eq("equipamento_id", id);
    await supabaseAdmin.from("equipamento_historico").delete().eq("equipamento_id", id);

    const { error } = await supabaseAdmin.from("equipamentos").delete().eq("id", id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("usuarios_auditoria").insert({
      ator_id: context.userId,
      alvo_id: context.userId,
      acao: "equipamento_excluido",
      detalhes: {
        equipamento_id: id,
        equipamento: rotulo,
        motivo: data.motivo.trim(),
        excluido_em: new Date().toISOString(),
      } as never,
    });

    return { ok: true, equipamento: rotulo };
  });
