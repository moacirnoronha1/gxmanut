import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { ensureMasterUser, resolveLoginEmail, registrarAcesso } from "@/lib/users.functions";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/auth")({
  // A tela é estática no primeiro render (sessão é lida só em efeito),
  // então pode ser renderizada no servidor sem divergência de hidratação.
  head: () => ({
    meta: [
      { title: "Entrar — Manutenção Xica da Silva" },
      { name: "description", content: "Acesse o sistema de manutenção Xica da Silva." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const ensureMaster = useServerFn(ensureMasterUser);
  const resolve = useServerFn(resolveLoginEmail);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    ensureMaster({}).catch((e) => console.warn("bootstrap:", e));
    // Sessão local: evita erro de rede/refresh token inválido travando a tela.
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!data.session) return;
        const { error } = await supabase.auth.getUser();
        if (error) {
          // Token velho/corrompido: limpa e deixa o usuário entrar de novo.
          await supabase.auth.signOut().catch(() => {});
          return;
        }
        navigate({ to: "/", replace: true });
      })
      .catch(() => {});
  }, [ensureMaster, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Limpa qualquer sessão inválida antes de tentar entrar.
      const { data: current } = await supabase.auth.getSession();
      if (current.session) await supabase.auth.signOut().catch(() => {});

      const { email } = await resolve({ data: { username } });
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw new Error(
          /invalid login/i.test(error.message)
            ? "Usuário ou senha inválidos."
            : `Falha ao entrar: ${error.message}`,
        );
      }
      if (!data.session) throw new Error("Não foi possível iniciar a sessão. Tente novamente.");

      // Garante que a sessão já está persistida antes de navegar (evita voltar ao login).
      for (let i = 0; i < 20; i++) {
        const { data: s } = await supabase.auth.getSession();
        if (s.session) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      try {
        await registrarAcessoFn({});
      } catch {
        // auditoria de acesso não deve impedir a entrada
      }
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Manutenção Xica da Silva</h1>
          <p className="text-sm text-muted-foreground mt-1">Sistema de controle de manutenção</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription>Acesse com seu nome de usuário e senha.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Esqueceu sua senha? Solicite ao Usuário Mestre.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}