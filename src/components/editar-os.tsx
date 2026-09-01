import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type {
  OS,
  Profile,
  Setor,
  Equipamento,
  CategoriaProblema,
  Urgencia,
  StatusOS,
} from "@/lib/db-types";
import { equipeOSQuery } from "@/lib/equipe-os";
import { useSessaoUsuario } from "@/lib/sessao";
import { CAMPOS_EDICAO_OS, type CampoEdicaoOS, type OSEditavel } from "@/lib/os-edicao";
import { showDbError } from "@/lib/db-error";

type Props = {
  os: OS;
  setores: Setor[];
  equipamentos: Equipamento[];
  categorias: CategoriaProblema[];
  urgencias: Urgencia[];
  status: StatusOS[];
  profiles: Profile[];
};

const vazioParaNull = (v: string) => (v === "none" ? null : v);

export function EditarOS({
  os,
  setores,
  equipamentos,
  categorias,
  urgencias,
  status,
  profiles,
}: Props) {
  const qc = useQueryClient();
  const { perfil, roles, mestre } = useSessaoUsuario();
  const { data: equipe = [] } = useQuery(equipeOSQuery(os.id));
  const { data: anexos = [] } = useQuery({
    queryKey: ["os_anexos", os.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_anexos")
        .select("id, nome, tipo, url, created_at")
        .eq("os_id", os.id)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: permissoes = [] } = useQuery({
    queryKey: ["os_edicao_permissoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("os_edicao_permissoes" as never)
        .select("role, campo, permitido");
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        role: string;
        campo: CampoEdicaoOS;
        permitido: boolean;
      }>;
    },
  });
  const [aberto, setAberto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<OSEditavel>(() => valoresIniciais(os));
  const [apoio, setApoio] = useState<string[]>([]);
  const [novosAnexos, setNovosAnexos] = useState<File[]>([]);

  useEffect(() => {
    if (!aberto) return;
    setForm(valoresIniciais(os));
    setApoio(equipe.filter((x) => x.papel === "apoio").map((x) => x.tecnico_id));
    setNovosAnexos([]);
  }, [aberto, os, equipe]);

  const concluida =
    !!os.concluida_em || status.find((x) => x.id === os.status_id)?.is_final === true;
  const rolesPermitidas = roles.filter((r) => ["admin", "tecnico", "responsavel"].includes(r));
  const campos = useMemo(() => {
    if (mestre) return new Set<CampoEdicaoOS>(CAMPOS_EDICAO_OS.map((x) => x.campo));
    return new Set(
      permissoes
        .filter((p) => rolesPermitidas.includes(p.role as never) && p.permitido)
        .map((p) => p.campo),
    );
  }, [mestre, permissoes, rolesPermitidas]);
  const podeEditar = mestre || (!concluida && campos.size > 0);
  const tecnicos = profiles;
  const up = <K extends keyof OSEditavel>(campo: K, valor: OSEditavel[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  async function salvar() {
    if (!form.titulo.trim() || !form.descricao.trim()) {
      toast.error("Título e descrição são obrigatórios.");
      setConfirmando(false);
      return;
    }
    setSalvando(true);
    const alteracoes = Object.fromEntries(
      Object.entries({
        ...form,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
      }).filter(
        ([campo, valor]) => campos.has(campo as CampoEdicaoOS) && valor !== os[campo as keyof OS],
      ),
    );
    const enviados: Array<{ id: string; path: string }> = [];
    if (campos.has("anexos") && novosAnexos.length) {
      for (const arquivo of novosAnexos) {
        const path = `os/${os.id}/${crypto.randomUUID()}-${arquivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const upload = await supabase.storage.from("comprovantes").upload(path, arquivo);
        if (upload.error) {
          await limparUploads(enviados);
          setSalvando(false);
          return showDbError(upload.error);
        }
        const salvo = await supabase
          .from("os_anexos")
          .insert({
            os_id: os.id,
            autor_id: perfil?.id ?? null,
            nome: arquivo.name,
            tipo: arquivo.type || null,
            url: path,
          })
          .select("id")
          .single();
        if (salvo.error) {
          await supabase.storage.from("comprovantes").remove([path]);
          await limparUploads(enviados);
          setSalvando(false);
          return showDbError(salvo.error);
        }
        enviados.push({ id: salvo.data.id, path });
      }
    }
    const { error } = await supabase.rpc(
      "editar_ordem_servico" as never,
      {
        p_os_id: os.id,
        p_alteracoes: alteracoes,
        p_tecnicos_apoio: campos.has("tecnicos_apoio") ? apoio : null,
      } as never,
    );
    setSalvando(false);
    if (error) {
      await limparUploads(enviados);
      setConfirmando(false);
      return showDbError(error);
    }
    if (enviados.length) {
      await supabase.from("os_historico").insert({
        os_id: os.id,
        usuario_id: perfil?.id ?? null,
        acao: concluida ? "OS editada após conclusão" : "OS editada",
        detalhes: {
          anexos: {
            anterior: anexos.map((a) => a.nome),
            novo: [...anexos.map((a) => a.nome), ...novosAnexos.map((a) => a.name)],
          },
        },
      });
    }
    setConfirmando(false);
    setAberto(false);
    toast.success("Alterações salvas na OS.");
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["os", os.id] }),
      qc.invalidateQueries({ queryKey: ["ordens_servico"] }),
      qc.invalidateQueries({ queryKey: ["os_hist", os.id] }),
      qc.invalidateQueries({ queryKey: ["os_tecnicos", os.id] }),
      qc.invalidateQueries({ queryKey: ["os_anexos", os.id] }),
    ]);
  }

  async function limparUploads(itens: Array<{ id: string; path: string }>) {
    if (!itens.length) return;
    await supabase
      .from("os_anexos")
      .delete()
      .in(
        "id",
        itens.map((x) => x.id),
      );
    await supabase.storage.from("comprovantes").remove(itens.map((x) => x.path));
  }

  if (!podeEditar) return null;
  const campo = (nome: CampoEdicaoOS) => mestre || campos.has(nome);

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (!v) setConfirmando(false);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Pencil className="size-4" /> EDITAR OS
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar OS #{os.numero}</DialogTitle>
          <DialogDescription>
            O número, os custos, comentários, anexos e todo o histórico serão preservados.
          </DialogDescription>
        </DialogHeader>
        {concluida && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            Esta OS está concluída. A edição será destacada no histórico como realizada após a
            conclusão.
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {campo("titulo") && (
            <div className="sm:col-span-2">
              <Label>Título da OS</Label>
              <Input value={form.titulo} onChange={(e) => up("titulo", e.target.value)} />
            </div>
          )}
          {campo("descricao") && (
            <div className="sm:col-span-2">
              <Label>Descrição do problema</Label>
              <Textarea
                rows={4}
                value={form.descricao}
                onChange={(e) => up("descricao", e.target.value)}
              />
            </div>
          )}
          {campo("setor_id") && (
            <CampoSelect
              label="Setor"
              value={form.setor_id}
              onChange={(v) => up("setor_id", vazioParaNull(v))}
              itens={setores}
            />
          )}
          {campo("local") && (
            <div>
              <Label>Local</Label>
              <Input
                value={form.local ?? ""}
                onChange={(e) => up("local", e.target.value || null)}
              />
            </div>
          )}
          {campo("equipamento_id") && (
            <CampoSelect
              label="Equipamento"
              value={form.equipamento_id}
              onChange={(v) => up("equipamento_id", vazioParaNull(v))}
              itens={equipamentos}
            />
          )}
          {campo("categoria_id") && (
            <CampoSelect
              label="Categoria"
              value={form.categoria_id}
              onChange={(v) => up("categoria_id", vazioParaNull(v))}
              itens={categorias}
            />
          )}
          {campo("urgencia_id") && (
            <CampoSelect
              label="Urgência"
              value={form.urgencia_id}
              onChange={(v) => up("urgencia_id", vazioParaNull(v))}
              itens={urgencias}
            />
          )}
          {campo("tecnico_id") && (
            <CampoSelect
              label="Técnico responsável"
              value={form.tecnico_id}
              onChange={(v) => up("tecnico_id", vazioParaNull(v))}
              itens={tecnicos.map((x) => ({ id: x.id, nome: x.nome_completo || x.nome }))}
            />
          )}
          {campo("data_desejada") && (
            <div>
              <Label>Data prevista</Label>
              <Input
                type="datetime-local"
                value={form.data_desejada?.slice(0, 16) ?? ""}
                onChange={(e) =>
                  up(
                    "data_desejada",
                    e.target.value ? new Date(e.target.value).toISOString() : null,
                  )
                }
              />
            </div>
          )}
          {campo("status_id") && (
            <CampoSelect
              label="Status"
              value={form.status_id}
              onChange={(v) => up("status_id", vazioParaNull(v))}
              itens={status}
            />
          )}
          {campo("tecnicos_apoio") && (
            <div className="sm:col-span-2 space-y-2">
              <Label>Técnicos de apoio</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {tecnicos.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 rounded-md border p-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={apoio.includes(p.id)}
                      onChange={(e) =>
                        setApoio((a) =>
                          e.target.checked ? [...a, p.id] : a.filter((id) => id !== p.id),
                        )
                      }
                    />
                    {p.nome_completo || p.nome}
                  </label>
                ))}
              </div>
            </div>
          )}
          {campo("recomendacoes") && (
            <div className="sm:col-span-2">
              <Label>Observações</Label>
              <Textarea
                rows={3}
                value={form.recomendacoes ?? ""}
                onChange={(e) => up("recomendacoes", e.target.value || null)}
              />
            </div>
          )}
          {campo("anexos") && (
            <div className="sm:col-span-2 space-y-2">
              <Label>Fotos e anexos</Label>
              {anexos.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Existentes (serão preservados): {anexos.map((a) => a.nome).join(", ")}
                </div>
              )}
              <Input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setNovosAnexos(Array.from(e.target.files ?? []))}
              />
              {novosAnexos.length > 0 && (
                <div className="text-xs">Novos: {novosAnexos.map((a) => a.name).join(", ")}</div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          {confirmando ? (
            <>
              <span className="mr-auto text-sm font-medium">Salvar alterações na OS?</span>
              <Button variant="outline" onClick={() => setConfirmando(false)}>
                Cancelar
              </Button>
              <Button onClick={salvar} disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar alterações"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setConfirmando(true)}>Revisar e salvar</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function valoresIniciais(os: OS): OSEditavel {
  return {
    titulo: os.titulo,
    descricao: os.descricao,
    setor_id: os.setor_id,
    local: os.local,
    equipamento_id: os.equipamento_id,
    categoria_id: os.categoria_id,
    urgencia_id: os.urgencia_id,
    tecnico_id: os.tecnico_id,
    data_desejada: os.data_desejada,
    recomendacoes: os.recomendacoes,
    status_id: os.status_id,
  };
}

function CampoSelect({
  label,
  value,
  onChange,
  itens,
}: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
  itens: Array<{ id: string; nome: string }>;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value ?? "none"} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Não informado</SelectItem>
          {itens.map((x) => (
            <SelectItem key={x.id} value={x.id}>
              {x.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
