import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env["VAPID_PUBLIC_KEY"] ?? "" };
});

export const registrarDispositivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        endpoint: z.string().url(),
        p256dh: z.string().min(10),
        auth: z.string().min(5),
        nome: z.string().min(1).max(60).default("Dispositivo"),
        userAgent: z.string().max(400).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const agora = new Date().toISOString();
    const { data: row, error } = await supabaseAdmin
      .from("push_devices")
      .upsert(
        {
          user_id: context.userId,
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
          nome: data.nome,
          user_agent: data.userAgent ?? null,
          ativo: true,
          ultimo_acesso: agora,
          ultimo_erro: null,
        },
        { onConflict: "endpoint" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { device: row };
  });

export const removerDispositivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_devices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const enviarNotificacaoTeste = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ endpoint: z.string().url().optional() }).parse(input ?? {}))
  .handler(async ({ context }) => {
    const { enviarPushParaUsuario, getAdmin } = await import("./push.server");
    const admin = await getAdmin();
    const { data: notif } = await admin
      .from("notificacoes")
      .insert({
        user_id: context.userId,
        tipo: "teste",
        prioridade: "normal",
        titulo: "Manutenção Xica da Silva",
        mensagem: "Teste realizado com sucesso. Este aparelho está preparado para receber notificações.",
        url: "/configuracoes/notificacoes",
      })
      .select("id")
      .single();

    const res = await enviarPushParaUsuario(context.userId, {
      titulo: "Manutenção Xica da Silva",
      mensagem: "Teste realizado com sucesso. Este aparelho está preparado para receber notificações.",
      url: "/configuracoes/notificacoes",
      prioridade: "normal",
      notificacaoId: notif?.id ?? null,
      tipo: "teste",
      tag: "teste",
    });

    if (res.enviados > 0) {
      await admin
        .from("push_devices")
        .update({ ultimo_teste_em: new Date().toISOString() })
        .eq("user_id", context.userId)
        .eq("ativo", true);
    }
    return res;
  });

export const notificarOS = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ osId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { notificarAberturaOS } = await import("./push.server");
    return notificarAberturaOS(data.osId);
  });

export const confirmarNotificacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const agora = new Date().toISOString();
    const { data: notif, error } = await context.supabase
      .from("notificacoes")
      .update({ confirmada_em: agora, lida_em: agora })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("os_id")
      .maybeSingle();
    if (error) throw new Error(error.message);

    if (notif?.os_id) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("ordens_servico")
        .update({ confirmada_em: agora })
        .eq("id", notif.os_id)
        .is("confirmada_em", null);
    }
    await context.supabase
      .from("push_devices")
      .update({ ultima_confirmacao_em: agora })
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const assumirOS = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ osId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const agora = new Date().toISOString();
    const { data: os } = await supabaseAdmin
      .from("ordens_servico")
      .select("id,numero,assumida_por,assumida_em")
      .eq("id", data.osId)
      .maybeSingle();
    if (!os) throw new Error("OS não encontrada.");
    if (os.assumida_por && os.assumida_por !== context.userId) {
      return { ok: false, jaAssumida: true };
    }
    await supabaseAdmin
      .from("ordens_servico")
      .update({ assumida_por: context.userId, assumida_em: agora, confirmada_em: agora })
      .eq("id", data.osId);

    const { data: perfil } = await supabaseAdmin
      .from("profiles")
      .select("nome_completo,nome")
      .eq("id", context.userId)
      .maybeSingle();
    const quem = perfil?.nome_completo || perfil?.nome || "Usuário";

    await supabaseAdmin
      .from("notificacoes")
      .update({ confirmada_em: agora, resolvida_em: agora })
      .eq("os_id", data.osId)
      .is("confirmada_em", null);

    await supabaseAdmin.from("os_historico").insert({
      os_id: data.osId,
      usuario_id: context.userId,
      acao: "assumida",
      detalhes: { por: quem, em: agora },
    });

    const { notificarUsuarios, idsMestres } = await import("./push.server");
    await notificarUsuarios(await idsMestres(), {
      tipo: "os_assumida",
      prioridade: "normal",
      titulo: `OS #${os.numero} assumida`,
      mensagem: `${quem} assumiu a OS #${os.numero}. Alertas repetitivos encerrados.`,
      url: `/ordens/${data.osId}`,
      os_id: data.osId,
    });

    return { ok: true, por: quem, em: agora };
  });

export const salvarPreferencias = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        tipos: z.record(z.string(), z.boolean()),
        silencio_ativo: z.boolean(),
        silencio_inicio: z.string(),
        silencio_fim: z.string(),
        som_urgente: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("notificacao_preferencias").upsert({
      user_id: context.userId,
      ...data,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const salvarConfigEscalonamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        urgente_reforco_min: z.number().int().min(1).max(240),
        urgente_mestre_min: z.number().int().min(1).max(480),
        extrema_repeticao_min: z.number().int().min(1).max(120),
        mp_atraso_repetir_dias: z.number().int().min(1).max(30),
        os_nao_urgente_lembrete_diario: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: mestre } = await context.supabase.rpc("is_mestre", { _user_id: context.userId });
    if (!mestre) throw new Error("Apenas o Usuário Mestre pode alterar o escalonamento.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("notificacao_config")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const diagnosticoNotificacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: devices } = await supabaseAdmin
      .from("push_devices")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    const { data: envios } = await supabaseAdmin
      .from("notificacao_envios")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    const { data: ultimaConfirmada } = await supabaseAdmin
      .from("notificacoes")
      .select("id,titulo,confirmada_em")
      .eq("user_id", context.userId)
      .not("confirmada_em", "is", null)
      .order("confirmada_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      servicoPush: Boolean(process.env["VAPID_PUBLIC_KEY"] && process.env["VAPID_PRIVATE_KEY"]),
      dispositivos: devices ?? [],
      envios: envios ?? [],
      ultimaConfirmada: ultimaConfirmada ?? null,
    };
  });

export const rodarRotinas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: mestre } = await context.supabase.rpc("is_mestre", { _user_id: context.userId });
    if (!mestre) throw new Error("Somente o Usuário Mestre pode executar as rotinas.");
    const { rodarRotinasNotificacao } = await import("./push.server");
    return rodarRotinasNotificacao();
  });
