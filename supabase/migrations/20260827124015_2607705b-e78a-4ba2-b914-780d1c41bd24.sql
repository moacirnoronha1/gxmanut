ALTER TABLE public.equipamentos ADD COLUMN IF NOT EXISTS criado_por uuid REFERENCES public.profiles(id);

CREATE OR REPLACE FUNCTION public.tg_equipamento_criado_por()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.criado_por IS NULL THEN NEW.criado_por := auth.uid(); END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_equipamento_criado_por ON public.equipamentos;
CREATE TRIGGER trg_equipamento_criado_por BEFORE INSERT ON public.equipamentos
FOR EACH ROW EXECUTE FUNCTION public.tg_equipamento_criado_por();

REVOKE EXECUTE ON FUNCTION public.tg_equipamento_criado_por() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Gestao gerencia equipamentos" ON public.equipamentos;

CREATE POLICY "Equipe cadastra equipamentos" ON public.equipamentos
FOR INSERT TO authenticated
WITH CHECK (
  private.is_admin(auth.uid()) OR private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid())
  OR private.has_role(auth.uid(), 'tecnico'::app_role) OR private.has_role(auth.uid(), 'responsavel'::app_role)
);

CREATE POLICY "Equipe edita equipamentos" ON public.equipamentos
FOR UPDATE TO authenticated
USING (
  private.is_admin(auth.uid()) OR private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid())
  OR private.has_role(auth.uid(), 'tecnico'::app_role) OR private.has_role(auth.uid(), 'responsavel'::app_role)
)
WITH CHECK (
  private.is_admin(auth.uid()) OR private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid())
  OR private.has_role(auth.uid(), 'tecnico'::app_role) OR private.has_role(auth.uid(), 'responsavel'::app_role)
);

CREATE POLICY "Gestao exclui equipamentos" ON public.equipamentos
FOR DELETE TO authenticated
USING (private.is_admin(auth.uid()) OR private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Gestao gerencia documentos equipamento" ON public.equipamento_documentos;

CREATE POLICY "Equipe adiciona documentos equipamento" ON public.equipamento_documentos
FOR INSERT TO authenticated
WITH CHECK (
  (autor_id IS NULL OR autor_id = auth.uid()) AND (
    private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid())
    OR private.has_role(auth.uid(), 'tecnico'::app_role) OR private.has_role(auth.uid(), 'responsavel'::app_role)
  )
);

CREATE POLICY "Autor ou gestao remove documentos equipamento" ON public.equipamento_documentos
FOR DELETE TO authenticated
USING (autor_id = auth.uid() OR private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()));

CREATE POLICY "Gestao atualiza documentos equipamento" ON public.equipamento_documentos
FOR UPDATE TO authenticated
USING (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()))
WITH CHECK (private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Gestor/admin leem fornecedores" ON public.fornecedores;
CREATE POLICY "Equipe le fornecedores" ON public.fornecedores
FOR SELECT TO authenticated
USING (
  private.is_mestre(auth.uid()) OR private.is_gestor_or_admin(auth.uid())
  OR private.has_role(auth.uid(), 'tecnico'::app_role) OR private.has_role(auth.uid(), 'responsavel'::app_role)
);