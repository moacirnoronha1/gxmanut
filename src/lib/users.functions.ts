import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const USER_DOMAIN = "xica.local";
const MASTER_USERNAME = "moacir";
const MASTER_PASSWORD = "3101";

function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${USER_DOMAIN}`;
}

const usernameSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toLowerCase().replace(/\s+/g, "") : v),
  z
    .string()
    .min(3, "Nome de usuário muito curto")
    .max(30)
    .regex(/^[a-z0-9._-]+$/, "Use apenas letras, números, . _ -"),
);

// Public bootstrap: creates MOACIR if missing. Idempotent.
export const ensureMasterUser = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = usernameToEmail(MASTER_USERNAME);

  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("is_master", true)
    .limit(1)
    .maybeSingle();
  if (existing) return { ok: true, created: false as const };

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: MASTER_PASSWORD,
    email_confirm: true,
    user_metadata: {
      username: MASTER_USERNAME,
      nome_completo: "MOACIR",
      is_master: true,
      must_change_password: false,
    },
  });
  if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar usuário mestre");

  await supabaseAdmin.from("profiles").update({ is_master: true, username: MASTER_USERNAME, nome_completo: "MOACIR" }).eq("id", created.user.id);
  await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "mestre" });
  return { ok: true, created: true as const };
});

// Resolve username → synthetic email (client uses this for login).
export const resolveLoginEmail = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ username: usernameSchema }).parse(input))
  .handler(async ({ data }) => ({ email: usernameToEmail(data.username) }));

async function assertMestre(context: { supabase: import("@supabase/supabase-js").SupabaseClient; userId: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("is_master")
    .eq("id", context.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.is_master) throw new Error("Apenas o Usuário Mestre pode executar esta ação.");
}

async function audit(actorId: string, alvoId: string | null, acao: string, detalhes: Record<string, unknown> = {}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("usuarios_auditoria").insert({ ator_id: actorId, alvo_id: alvoId, acao, detalhes: detalhes as never });
}

export const createUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      username: usernameSchema,
      password: z.string().min(4).max(72),
      nome_completo: z.string().trim().min(1).max(120),
      funcao: z.string().trim().max(80).optional().nullable(),
      setor_id: z.string().uuid().optional().nullable(),
      role: z.enum(["admin", "gestor", "responsavel", "tecnico"]),
      must_change_password: z.boolean().optional().default(true),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertMestre(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = usernameToEmail(data.username);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        username: data.username.toLowerCase(),
        nome_completo: data.nome_completo,
        funcao: data.funcao ?? null,
        setor_id: data.setor_id ?? null,
        must_change_password: data.must_change_password,
      },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar usuário");

    await supabaseAdmin.from("profiles").update({
      username: data.username.toLowerCase(),
      nome_completo: data.nome_completo,
      funcao: data.funcao ?? null,
      setor_id: data.setor_id ?? null,
      must_change_password: data.must_change_password,
      criado_por: context.userId,
    }).eq("id", created.user.id);
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });
    await audit(context.userId, created.user.id, "usuario_criado", { username: data.username, role: data.role });
    return { ok: true, id: created.user.id };
  });

async function loadTarget(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("profiles").select("id, is_master, username").eq("id", userId).maybeSingle();
  return data;
}

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      user_id: z.string().uuid(),
      new_password: z.string().min(4).max(72),
      must_change_password: z.boolean().optional().default(true),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const target = await loadTarget(data.user_id);
    if (!target) throw new Error("Usuário não encontrado");
    if (target.is_master && target.id !== context.userId) {
      throw new Error("Apenas o próprio Usuário Mestre pode alterar sua senha.");
    }
    if (!target.is_master) await assertMestre(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: data.new_password });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({
      must_change_password: target.is_master ? false : data.must_change_password,
      tentativas_falhas: 0,
      bloqueado: false,
      bloqueado_ate: null,
    }).eq("id", data.user_id);
    await audit(context.userId, data.user_id, "senha_redefinida");
    return { ok: true };
  });

export const setUserBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ user_id: z.string().uuid(), bloqueado: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertMestre(context);
    const target = await loadTarget(data.user_id);
    if (!target) throw new Error("Usuário não encontrado");
    if (target.is_master) throw new Error("O Usuário Mestre não pode ser bloqueado.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ bloqueado: data.bloqueado, ativo: !data.bloqueado }).eq("id", data.user_id);
    await audit(context.userId, data.user_id, data.bloqueado ? "bloqueado" : "desbloqueado");
    return { ok: true };
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ user_id: z.string().uuid(), ativo: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertMestre(context);
    const target = await loadTarget(data.user_id);
    if (!target) throw new Error("Usuário não encontrado");
    if (target.is_master) throw new Error("O Usuário Mestre não pode ser desativado.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ ativo: data.ativo }).eq("id", data.user_id);
    await audit(context.userId, data.user_id, data.ativo ? "ativado" : "desativado");
    return { ok: true };
  });

export const updateUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ user_id: z.string().uuid(), username: usernameSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertMestre(context);
    const target = await loadTarget(data.user_id);
    if (!target) throw new Error("Usuário não encontrado");
    if (target.is_master) throw new Error("O nome do Usuário Mestre não pode ser alterado.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const newUsername = data.username.toLowerCase();
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      email: usernameToEmail(newUsername),
    });
    if (authErr) throw new Error(authErr.message);
    await supabaseAdmin.from("profiles").update({ username: newUsername, email: usernameToEmail(newUsername) }).eq("id", data.user_id);
    await audit(context.userId, data.user_id, "usuario_renomeado", { username: newUsername });
    return { ok: true };
  });

export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertMestre(context);
    const target = await loadTarget(data.user_id);
    if (!target) throw new Error("Usuário não encontrado");
    if (target.is_master) throw new Error("O Usuário Mestre não pode ser excluído.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Auditoria antes de excluir (o alvo deixa de existir).
    await audit(context.userId, data.user_id, "usuario_excluido", { username: target.username });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    await supabaseAdmin.from("profiles").delete().eq("id", data.user_id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const changeMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ new_password: z.string().min(4).max(72) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, { password: data.new_password });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ must_change_password: false }).eq("id", context.userId);
    await audit(context.userId, context.userId, "senha_alterada");
    return { ok: true };
  });

// Registra o acesso do usuário autenticado (auditoria por ID real da sessão).
export const registrarAcesso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: perfil } = await supabaseAdmin
      .from("profiles")
      .select("username")
      .eq("id", context.userId)
      .maybeSingle();
    await supabaseAdmin
      .from("profiles")
      .update({ ultimo_acesso: new Date().toISOString(), tentativas_falhas: 0 })
      .eq("id", context.userId);
    await audit(context.userId, context.userId, "login", { username: perfil?.username ?? null });
    return { ok: true };
  });
