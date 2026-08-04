import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type DbError = { message: string; code?: string; details?: string | null; hint?: string | null };

/**
 * Traduz erros do banco para mensagens claras e trata sessão expirada.
 * Retorna sempre `true` para permitir `if (error) return showDbError(error);`
 */
export function showDbError(error: DbError, contexto?: string): true {
  // eslint-disable-next-line no-console
  console.error("[db]", contexto ?? "", error);

  const msg = (error.message || "").toLowerCase();
  const code = error.code ?? "";

  const sessaoExpirada =
    msg.includes("jwt") ||
    msg.includes("expired") ||
    msg.includes("invalid token") ||
    msg.includes("not authenticated") ||
    code === "PGRST301";

  if (sessaoExpirada) {
    toast.error("Sua sessão expirou. Entre novamente para continuar.");
    void supabase.auth.signOut().finally(() => {
      if (typeof window !== "undefined") window.location.href = "/auth";
    });
    return true;
  }

  if (code === "42501" || msg.includes("row-level security") || msg.includes("permission denied")) {
    toast.error("Você não tem permissão para esta ação. Peça ao Usuário Mestre.");
    return true;
  }

  if (code === "23505" || msg.includes("duplicate key")) {
    toast.error("Já existe um registro com esses dados.");
    return true;
  }

  if (code === "23503" || msg.includes("foreign key")) {
    toast.error("Registro vinculado a outros dados. Remova os vínculos antes.");
    return true;
  }

  if (code === "23502" || msg.includes("not-null")) {
    toast.error("Preencha todos os campos obrigatórios.");
    return true;
  }

  if (msg.includes("invalid input syntax")) {
    toast.error("Algum campo está com formato inválido (data ou número).");
    return true;
  }

  if (msg.includes("failed to fetch") || msg.includes("networkerror")) {
    toast.error("Sem conexão com o servidor. Verifique a internet e tente de novo.");
    return true;
  }

  toast.error(error.message || "Não foi possível salvar. Tente novamente.");
  return true;
}
