
-- Extend profiles for username-based auth
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS nome_completo TEXT,
  ADD COLUMN IF NOT EXISTS funcao TEXT,
  ADD COLUMN IF NOT EXISTS setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_master BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bloqueado_ate TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tentativas_falhas INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_uidx
  ON public.profiles ((lower(username))) WHERE username IS NOT NULL;

-- Helper: is master
CREATE OR REPLACE FUNCTION public.is_mestre(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'mestre');
$$;
REVOKE ALL ON FUNCTION public.is_mestre(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_mestre(UUID) TO authenticated, service_role;

-- Update handle_new_user to accept username metadata and NOT auto-assign responsavel
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, username, nome_completo, funcao, setor_id, is_master, must_change_password)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'nome_completo',
    NEW.raw_user_meta_data->>'funcao',
    NULLIF(NEW.raw_user_meta_data->>'setor_id','')::UUID,
    COALESCE((NEW.raw_user_meta_data->>'is_master')::BOOLEAN, false),
    COALESCE((NEW.raw_user_meta_data->>'must_change_password')::BOOLEAN, false)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Audit log for users
CREATE TABLE IF NOT EXISTS public.usuarios_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  alvo_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.usuarios_auditoria TO authenticated;
GRANT ALL ON public.usuarios_auditoria TO service_role;
ALTER TABLE public.usuarios_auditoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mestre le auditoria" ON public.usuarios_auditoria;
CREATE POLICY "mestre le auditoria" ON public.usuarios_auditoria FOR SELECT
  TO authenticated USING (public.is_mestre(auth.uid()));
DROP POLICY IF EXISTS "auditoria insert" ON public.usuarios_auditoria;
CREATE POLICY "auditoria insert" ON public.usuarios_auditoria FOR INSERT
  TO authenticated WITH CHECK (true);

-- Rewrite profiles RLS
DROP POLICY IF EXISTS "usuarios veem proprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "usuarios editam proprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "admins gerenciam profiles" ON public.profiles;
DROP POLICY IF EXISTS "mestre gerencia profiles" ON public.profiles;
DROP POLICY IF EXISTS "leitura de profiles" ON public.profiles;
DROP POLICY IF EXISTS "mestre insere profiles" ON public.profiles;
DROP POLICY IF EXISTS "mestre atualiza profiles" ON public.profiles;
DROP POLICY IF EXISTS "mestre exclui profiles" ON public.profiles;

CREATE POLICY "leitura de profiles" ON public.profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id
    OR public.is_mestre(auth.uid())
    OR public.is_gestor_or_admin(auth.uid())
  );

CREATE POLICY "mestre insere profiles" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (public.is_mestre(auth.uid()));

CREATE POLICY "atualiza profiles" ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR (public.is_mestre(auth.uid()) AND is_master = false)
  )
  WITH CHECK (
    auth.uid() = id
    OR (public.is_mestre(auth.uid()) AND is_master = false)
  );

CREATE POLICY "mestre exclui profiles" ON public.profiles FOR DELETE
  TO authenticated USING (public.is_mestre(auth.uid()) AND is_master = false);

-- Rewrite user_roles RLS
DROP POLICY IF EXISTS "usuarios veem proprias roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins gerenciam roles" ON public.user_roles;
DROP POLICY IF EXISTS "mestre gerencia roles" ON public.user_roles;
DROP POLICY IF EXISTS "leitura de roles" ON public.user_roles;
DROP POLICY IF EXISTS "mestre insere roles" ON public.user_roles;
DROP POLICY IF EXISTS "mestre remove roles" ON public.user_roles;

CREATE POLICY "leitura de roles" ON public.user_roles FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR public.is_mestre(auth.uid())
    OR public.is_gestor_or_admin(auth.uid())
  );

CREATE POLICY "mestre insere roles" ON public.user_roles FOR INSERT
  TO authenticated WITH CHECK (
    public.is_mestre(auth.uid()) AND role <> 'mestre'
  );

CREATE POLICY "mestre remove roles" ON public.user_roles FOR DELETE
  TO authenticated USING (
    public.is_mestre(auth.uid())
    AND role <> 'mestre'
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id AND p.is_master = true)
  );
