import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";

export type Prioridade = "normal" | "urgente" | "extrema";

export type NovaNotificacao = {
  tipo: string;
  prioridade?: Prioridade;
  titulo: string;
  mensagem: string;
  url?: string | null;
  os_id?: string | null;
  manutencao_id?: string | null;
  dados?: Record<string, unknown>;
  tag?: string;
};

export async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function vapidKeys() {
  const subject = process.env["VAPID_SUBJECT"];
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  if (!subject || !publicKey || !privateKey) throw new Error("Chaves de push não configuradas no servidor.");
  return { subject, publicKey, privateKey };
}

export function vapidPublicKey(): string {
  return process.env["VAPID_PUBLIC_KEY"] ?? "";
}

/** Horário local de Fortaleza (UTC-3). */
function minutosLocais(d = new Date()): number {
  const local = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
}

function hhmmParaMin(v: string | null | undefined): number {
  if (!v) return 0;
  const [h, m] = v.split(":");
  return Number(h) * 60 + Number(m ?? 0);
}

function dentroDoSilencio(inicio: string, fim: string): boolean {
  const agora = minutosLocais();
  const i = hhmmParaMin(inicio);
  const f = hhmmParaMin(fim);
  return i <= f ? agora >= i && agora < f : agora >= i || agora < f;
}

type DeviceRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
};

export type ResultadoEnvio = {
  enviados: number;
  falhas: number;
  dispositivos: number;
  erros: string[];
  adiadoSilencio?: boolean;
};

/** Envia o push para todos os dispositivos ativos do usuário e registra a auditoria. */
export async function enviarPushParaUsuario(
  userId: string,
  payload: {
    titulo: string;
    mensagem: string;
    url?: string | null;
    prioridade?: Prioridade;
    notificacaoId?: string | null;
    tipo: string;
    tag?: string;
  },
): Promise<ResultadoEnvio> {
  const admin = await getAdmin();
  const { data: devices } = await admin
    .from("push_devices")
    .select("id,endpoint,p256dh,auth,user_id")
    .eq("user_id", userId)
    .eq("ativo", true);

  const lista = (devices ?? []) as DeviceRow[];
  const resultado: ResultadoEnvio = { enviados: 0, falhas: 0, dispositivos: lista.length, erros: [] };
  if (!lista.length) {
    await admin.from("notificacao_envios").insert({
      notificacao_id: payload.notificacaoId ?? null,
      user_id: userId,
      tipo: payload.tipo,
      status: "sem_dispositivo",
      erro: "Nenhum dispositivo registrado para este usuário.",
    });
    return resultado;
  }

  const vapid = vapidKeys();
  const corpo = JSON.stringify({
    titulo: payload.titulo,
    mensagem: payload.mensagem,
    url: payload.url ?? "/notificacoes",
    prioridade: payload.prioridade ?? "normal",
    notificacaoId: payload.notificacaoId ?? null,
    tag: payload.tag,
  });

  for (const device of lista) {
    const subscription: PushSubscription = {
      endpoint: device.endpoint,
      expirationTime: null,
      keys: { p256dh: device.p256dh, auth: device.auth },
    };
    try {
      const req = await buildPushPayload(
        { data: corpo, options: { ttl: payload.prioridade === "normal" ? 3600 : 300, urgency: payload.prioridade === "normal" ? "normal" : "high" } },
        subscription,
        vapid,
      );
      const res = await fetch(device.endpoint, req as unknown as RequestInit);
      const ok = res.status >= 200 && res.status < 300;
      const erroTexto = ok ? null : `${res.status} ${await res.text().catch(() => "")}`.slice(0, 500);

      await admin.from("notificacao_envios").insert({
        notificacao_id: payload.notificacaoId ?? null,
        user_id: userId,
        device_id: device.id,
        tipo: payload.tipo,
        status: ok ? "enviado" : "erro",
        http_status: res.status,
        erro: erroTexto,
      });

      if (ok) {
        resultado.enviados += 1;
        await admin
          .from("push_devices")
          .update({ ultimo_envio_em: new Date().toISOString(), ultimo_erro: null })
          .eq("id", device.id);
      } else {
        resultado.falhas += 1;
        resultado.erros.push(erroTexto ?? "erro");
        const expirado = res.status === 404 || res.status === 410;
        await admin
          .from("push_devices")
          .update({ ultimo_erro: erroTexto, ...(expirado ? { ativo: false } : {}) })
          .eq("id", device.id);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      resultado.falhas += 1;
      resultado.erros.push(msg);
      await admin.from("notificacao_envios").insert({
        notificacao_id: payload.notificacaoId ?? null,
        user_id: userId,
        device_id: device.id,
        tipo: payload.tipo,
        status: "erro",
        erro: msg.slice(0, 500),
      });
      await admin.from("push_devices").update({ ultimo_erro: msg.slice(0, 500) }).eq("id", device.id);
    }
  }

  if (payload.notificacaoId) {
    await admin
      .from("notificacoes")
      .update({ ultimo_envio_em: new Date().toISOString() })
      .eq("id", payload.notificacaoId);
  }
  return resultado;
}

/** Cria a notificação na central e dispara o push respeitando preferências e horário silencioso. */
export async function notificarUsuarios(userIds: string[], n: NovaNotificacao) {
  const admin = await getAdmin();
  const alvos = [...new Set(userIds.filter(Boolean))];
  const prioridade: Prioridade = n.prioridade ?? "normal";
  const resultados: { userId: string; enviados: number; falhas: number }[] = [];

  for (const userId of alvos) {
    const { data: prefs } = await admin
      .from("notificacao_preferencias")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const tipos = (prefs?.tipos ?? {}) as Record<string, boolean>;
    const desativado = tipos[n.tipo] === false;
    if (desativado && prioridade !== "extrema") {
      resultados.push({ userId, enviados: 0, falhas: 0 });
      continue;
    }

    const { data: criada } = await admin
      .from("notificacoes")
      .insert({
        user_id: userId,
        tipo: n.tipo,
        prioridade,
        titulo: n.titulo,
        mensagem: n.mensagem,
        url: n.url ?? null,
        os_id: n.os_id ?? null,
        manutencao_id: n.manutencao_id ?? null,
        dados: (n.dados ?? {}) as never,
      })
      .select("id,tentativas")
      .single();

    const silencio =
      prioridade === "normal" &&
      prefs?.silencio_ativo &&
      dentroDoSilencio(prefs.silencio_inicio as string, prefs.silencio_fim as string);

    if (silencio) {
      await admin.from("notificacao_envios").insert({
        notificacao_id: criada?.id ?? null,
        user_id: userId,
        tipo: n.tipo,
        status: "adiado_silencio",
      });
      resultados.push({ userId, enviados: 0, falhas: 0 });
      continue;
    }

    const r = await enviarPushParaUsuario(userId, {
      titulo: n.titulo,
      mensagem: n.mensagem,
      url: n.url ?? null,
      prioridade,
      notificacaoId: criada?.id ?? null,
      tipo: n.tipo,
      tag: n.tag,
    });
    if (criada?.id) {
      await admin
        .from("notificacoes")
        .update({ tentativas: (criada.tentativas ?? 0) + 1 })
        .eq("id", criada.id);
    }
    resultados.push({ userId, enviados: r.enviados, falhas: r.falhas });
  }
  return resultados;
}

export function classificarUrgencia(nome: string | null | undefined): Prioridade {
  const n = (nome ?? "").toLowerCase();
  if (n.includes("extrem")) return "extrema";
  if (n.includes("urgente") && !n.includes("não") && !n.includes("nao")) return "urgente";
  return "normal";
}

export async function idsMestres(): Promise<string[]> {
  const admin = await getAdmin();
  const { data } = await admin.from("profiles").select("id").eq("is_master", true).eq("ativo", true);
  return (data ?? []).map((p) => p.id as string);
}

/** IDs de todos os técnicos de manutenção ativos e não bloqueados. */
export async function idsTecnicos(): Promise<string[]> {
  const admin = await getAdmin();
  const { data: roles } = await admin.from("user_roles").select("user_id").eq("role", "tecnico");
  const ids = (roles ?? []).map((r) => r.user_id as string);
  if (ids.length === 0) return [];
  const { data: perfis } = await admin
    .from("profiles")
    .select("id")
    .in("id", ids)
    .eq("ativo", true)
    .eq("bloqueado", false);
  return (perfis ?? []).map((p) => p.id as string);
}

/** Notifica a abertura de uma OS conforme a urgência. */
export async function notificarAberturaOS(osId: string) {
  const admin = await getAdmin();
  const { data: os } = await admin
    .from("ordens_servico")
    .select(
      "id,numero,titulo,descricao,tecnico_id,solicitante_id,setor_id,equipamento_id,equipamento_nao_cadastrado,created_at,urgencia_id,urgencias(nome),setores(nome,responsavel_id),equipamentos(nome)",
    )
    .eq("id", osId)
    .maybeSingle();
  if (!os) return { ok: false, motivo: "OS não encontrada" };

  const urg = (os as any).urgencias?.nome as string | undefined;
  const prioridade = classificarUrgencia(urg);
  const setor = (os as any).setores?.nome ?? "Sem setor";
  const equipamento = (os as any).equipamentos?.nome ?? os.equipamento_nao_cadastrado ?? "Equipamento não informado";
  const hora = new Date(os.created_at as string).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Fortaleza",
  });
  const url = `/ordens/${os.id}`;

  const destinatarios: string[] = [];
  if (os.tecnico_id) destinatarios.push(os.tecnico_id as string);
  // Toda nova OS é disponibilizada para todos os técnicos ativos.
  destinatarios.push(...(await idsTecnicos()));
  const responsavelSetor = (os as any).setores?.responsavel_id as string | undefined;

  let titulo: string;
  let mensagem: string;
  let tipo: string;

  if (prioridade === "extrema") {
    tipo = "os_extrema";
    titulo = `ATENÇÃO — OS EXTREMAMENTE URGENTE #${os.numero}`;
    mensagem = `${equipamento} – ${setor}\nProblema: ${os.titulo}\nAberta às ${hora}. Toque para abrir e assumir a OS.`;
    if (responsavelSetor) destinatarios.push(responsavelSetor);
    destinatarios.push(...(await idsMestres()));
  } else if (prioridade === "urgente") {
    tipo = "os_urgente";
    titulo = `OS URGENTE #${os.numero}`;
    mensagem = `${equipamento} – ${setor}\nProblema: ${os.titulo}\nAberta às ${hora}. Toque para abrir a Ordem de Serviço.`;
    if (!os.tecnico_id) {
      if (responsavelSetor) destinatarios.push(responsavelSetor);
      destinatarios.push(...(await idsMestres()));
    }
  } else {
    tipo = "os_nova";
    titulo = `Nova OS #${os.numero} (não urgente)`;
    mensagem = `${equipamento} – ${setor}\n${os.titulo}`;
    if (responsavelSetor) destinatarios.push(responsavelSetor);
  }

  const res = await notificarUsuarios(destinatarios, {
    tipo,
    prioridade,
    titulo,
    mensagem,
    url,
    os_id: os.id as string,
    tag: `os-${os.numero}`,
  });

  await admin
    .from("ordens_servico")
    .update({ notificada_em: new Date().toISOString(), ultimo_alerta_em: new Date().toISOString() })
    .eq("id", os.id);

  return { ok: true, prioridade, destinatarios: destinatarios.length, res };
}

type Config = {
  urgente_reforco_min: number;
  urgente_mestre_min: number;
  extrema_repeticao_min: number;
  mp_atraso_repetir_dias: number;
  os_nao_urgente_lembrete_diario: boolean;
};

async function getConfig(): Promise<Config> {
  const admin = await getAdmin();
  const { data } = await admin.from("notificacao_config").select("*").eq("id", true).maybeSingle();
  return (data ?? {
    urgente_reforco_min: 10,
    urgente_mestre_min: 20,
    extrema_repeticao_min: 5,
    mp_atraso_repetir_dias: 1,
    os_nao_urgente_lembrete_diario: true,
  }) as Config;
}

const MIN = 60 * 1000;

/** Escalonamento automático de OS urgentes e extremamente urgentes sem confirmação. */
export async function processarEscalonamentos() {
  const admin = await getAdmin();
  const cfg = await getConfig();
  const agora = Date.now();
  let acoes = 0;

  const { data: abertas } = await admin
    .from("ordens_servico")
    .select(
      "id,numero,titulo,tecnico_id,assumida_por,confirmada_em,concluida_em,created_at,escalonamento_nivel,ultimo_alerta_em,setor_id,equipamento_nao_cadastrado,urgencias(nome),setores(nome,responsavel_id),equipamentos(nome)",
    )
    .is("concluida_em", null)
    .not("notificada_em", "is", null)
    .limit(200);

  for (const os of (abertas ?? []) as any[]) {
    if (os.confirmada_em || os.assumida_por) continue;
    const prioridade = classificarUrgencia(os.urgencias?.nome);
    if (prioridade === "normal") continue;

    const abertaHaMin = (agora - new Date(os.created_at).getTime()) / MIN;
    const ultimoAlerta = os.ultimo_alerta_em ? new Date(os.ultimo_alerta_em).getTime() : 0;
    const desdeAlerta = (agora - ultimoAlerta) / MIN;
    const setor = os.setores?.nome ?? "Sem setor";
    const equipamento = os.equipamentos?.nome ?? os.equipamento_nao_cadastrado ?? "Equipamento";
    const url = `/ordens/${os.id}`;
    const alvos: string[] = [];
    let nivel = os.escalonamento_nivel ?? 0;

    if (prioridade === "extrema") {
      if (desdeAlerta < cfg.extrema_repeticao_min) continue;
      if (os.tecnico_id) alvos.push(os.tecnico_id);
      if (os.setores?.responsavel_id) alvos.push(os.setores.responsavel_id);
      alvos.push(...(await idsMestres()));
      nivel += 1;
    } else {
      if (abertaHaMin >= cfg.urgente_mestre_min && nivel < 2) {
        if (os.tecnico_id) alvos.push(os.tecnico_id);
        if (os.setores?.responsavel_id) alvos.push(os.setores.responsavel_id);
        alvos.push(...(await idsMestres()));
        nivel = 2;
      } else if (abertaHaMin >= cfg.urgente_reforco_min && nivel < 1) {
        if (os.tecnico_id) alvos.push(os.tecnico_id);
        if (os.setores?.responsavel_id) alvos.push(os.setores.responsavel_id);
        nivel = 1;
      } else {
        continue;
      }
    }

    if (!alvos.length) continue;
    await notificarUsuarios(alvos, {
      tipo: prioridade === "extrema" ? "os_extrema" : "os_urgente",
      prioridade,
      titulo:
        prioridade === "extrema"
          ? `ATENÇÃO — OS #${os.numero} SEM CONFIRMAÇÃO`
          : `Reforço: OS URGENTE #${os.numero} sem confirmação`,
      mensagem: `${equipamento} – ${setor}\n${os.titulo}\nAberta há ${Math.round(abertaHaMin)} min sem confirmação.`,
      url,
      os_id: os.id,
      tag: `os-${os.numero}`,
    });
    await admin
      .from("ordens_servico")
      .update({ escalonamento_nivel: nivel, ultimo_alerta_em: new Date().toISOString() })
      .eq("id", os.id);
    acoes += 1;
  }
  return acoes;
}

/** Lembretes das manutenções periódicas (antecedência configurada) e manutenções atrasadas. */
export async function processarManutencoes() {
  const admin = await getAdmin();
  const hoje = new Date();
  const hojeISO = hoje.toISOString().slice(0, 10);
  let acoes = 0;

  const { data: mps } = await admin
    .from("manutencoes_periodicas")
    .select("id,nome,proxima_execucao,tecnico_id,tecnico_substituto_id,responsavel_id,setor_id,equipamento_id,situacao,setores(nome,responsavel_id),equipamentos(nome)")
    .eq("situacao", "ativa")
    .not("proxima_execucao", "is", null)
    .limit(300);

  const mestres = await idsMestres();

  for (const mp of (mps ?? []) as any[]) {
    const prevista = new Date(`${mp.proxima_execucao}T12:00:00Z`);
    const diffDias = Math.round((prevista.getTime() - new Date(`${hojeISO}T12:00:00Z`).getTime()) / (24 * 60 * MIN));
    const equipamento = mp.equipamentos?.nome ?? "—";
    const setor = mp.setores?.nome ?? "—";
    const url = `/manutencoes/${mp.id}`;

    const { data: lembretes } = await admin
      .from("mp_lembretes")
      .select("*")
      .eq("manutencao_id", mp.id)
      .eq("ativo", true);

    const base: string[] = [];
    if (mp.tecnico_id) base.push(mp.tecnico_id);
    if (mp.tecnico_substituto_id) base.push(mp.tecnico_substituto_id);
    if (mp.responsavel_id) base.push(mp.responsavel_id);
    if (mp.setores?.responsavel_id) base.push(mp.setores.responsavel_id);

    if (diffDias >= 0) {
      const regras = (lembretes ?? []).length
        ? (lembretes as any[])
        : [{ id: null, dias_antes: 7, destinatarios: [], usuarios_extra: [] }, { id: null, dias_antes: 2, destinatarios: [], usuarios_extra: [] }, { id: null, dias_antes: 0, destinatarios: [], usuarios_extra: [] }];

      for (const l of regras) {
        if (l.dias_antes !== diffDias) continue;
        const alvos = [...base, ...((l.usuarios_extra as string[]) ?? [])];
        if ((l.destinatarios as string[])?.includes("mestre")) alvos.push(...mestres);
        if (!alvos.length) continue;

        const { data: jaEnviado } = await admin
          .from("notificacoes")
          .select("id")
          .eq("manutencao_id", mp.id)
          .eq("tipo", "mp_proxima")
          .gte("created_at", `${hojeISO}T00:00:00Z`)
          .limit(1);
        if (jaEnviado?.length) continue;

        await notificarUsuarios(alvos, {
          tipo: "mp_proxima",
          prioridade: "normal",
          titulo: diffDias === 0 ? "Manutenção programada para hoje" : `Manutenção em ${diffDias} dia(s)`,
          mensagem: `${mp.nome}\n${equipamento} – ${setor}\nPrevista para ${prevista.toLocaleDateString("pt-BR", { timeZone: "UTC" })}.`,
          url,
          manutencao_id: mp.id,
          tag: `mp-${mp.id}`,
        });
        acoes += 1;
      }
    } else {
      const atraso = Math.abs(diffDias);
      const { data: jaEnviado } = await admin
        .from("notificacoes")
        .select("id")
        .eq("manutencao_id", mp.id)
        .eq("tipo", "mp_atrasada")
        .gte("created_at", `${hojeISO}T00:00:00Z`)
        .limit(1);
      if (jaEnviado?.length) continue;

      const alvos = [...base, ...mestres];
      if (!alvos.length) continue;
      await notificarUsuarios(alvos, {
        tipo: "mp_atrasada",
        prioridade: "urgente",
        titulo: "MANUTENÇÃO ATRASADA",
        mensagem: `${mp.nome}\n${equipamento} – ${setor}\nPrevista para ${prevista.toLocaleDateString("pt-BR", { timeZone: "UTC" })} — ${atraso} dia(s) de atraso.`,
        url,
        manutencao_id: mp.id,
        tag: `mp-${mp.id}`,
      });
      acoes += 1;
    }
  }
  return acoes;
}

/** Lembrete diário das OS não urgentes ainda pendentes. */
export async function processarPendentesNaoUrgentes() {
  const admin = await getAdmin();
  const cfg = await getConfig();
  if (!cfg.os_nao_urgente_lembrete_diario) return 0;
  const hojeISO = new Date().toISOString().slice(0, 10);

  const { data: abertas } = await admin
    .from("ordens_servico")
    .select("id,numero,titulo,tecnico_id,setor_id,concluida_em,urgencias(nome),setores(responsavel_id)")
    .is("concluida_em", null)
    .limit(300);

  const pendentes = ((abertas ?? []) as any[]).filter((o) => classificarUrgencia(o.urgencias?.nome) === "normal");
  if (!pendentes.length) return 0;

  const porUsuario = new Map<string, number>();
  for (const os of pendentes) {
    for (const alvo of [os.tecnico_id, os.setores?.responsavel_id].filter(Boolean) as string[]) {
      porUsuario.set(alvo, (porUsuario.get(alvo) ?? 0) + 1);
    }
  }
  let acoes = 0;
  for (const [userId, total] of porUsuario) {
    const { data: ja } = await admin
      .from("notificacoes")
      .select("id")
      .eq("user_id", userId)
      .eq("tipo", "os_pendentes")
      .gte("created_at", `${hojeISO}T00:00:00Z`)
      .limit(1);
    if (ja?.length) continue;
    await notificarUsuarios([userId], {
      tipo: "os_pendentes",
      prioridade: "normal",
      titulo: "Ordens de serviço pendentes",
      mensagem: `Você tem ${total} OS não urgente(s) aguardando atendimento.`,
      url: "/ordens",
      tag: "os-pendentes",
    });
    acoes += 1;
  }
  return acoes;
}

export async function rodarRotinasNotificacao() {
  const escalonamentos = await processarEscalonamentos();
  const manutencoes = await processarManutencoes();
  const pendentes = await processarPendentesNaoUrgentes();
  return { escalonamentos, manutencoes, pendentes };
}
