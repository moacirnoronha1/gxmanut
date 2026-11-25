-- 1. public.checklists
DROP POLICY IF EXISTS "checklists_read" ON public.checklists;
DROP POLICY IF EXISTS "checklists_insert" ON public.checklists;
DROP POLICY IF EXISTS "checklists_update" ON public.checklists;

CREATE POLICY "checklists_read"
ON public.checklists
FOR SELECT
TO authenticated
USING (
  private.is_mestre(auth.uid())
  OR private.is_gestor_or_admin(auth.uid())
  OR private.has_role(auth.uid(), 'tecnico'::public.app_role)
  OR private.has_role(auth.uid(), 'responsavel'::public.app_role)
);

CREATE POLICY "checklists_insert"
ON public.checklists
FOR INSERT
TO authenticated
WITH CHECK (
  (
    private.is_mestre(auth.uid())
    OR private.is_gestor_or_admin(auth.uid())
    OR private.has_role(auth.uid(), 'tecnico'::public.app_role)
    OR private.has_role(auth.uid(), 'responsavel'::public.app_role)
  )
  AND (criado_por IS NULL OR criado_por = auth.uid())
);

CREATE POLICY "checklists_update"
ON public.checklists
FOR UPDATE
TO authenticated
USING (
  private.is_mestre(auth.uid())
  OR private.is_gestor_or_admin(auth.uid())
  OR private.has_role(auth.uid(), 'tecnico'::public.app_role)
  OR private.has_role(auth.uid(), 'responsavel'::public.app_role)
)
WITH CHECK (
  private.is_mestre(auth.uid())
  OR private.is_gestor_or_admin(auth.uid())
  OR private.has_role(auth.uid(), 'tecnico'::public.app_role)
  OR private.has_role(auth.uid(), 'responsavel'::public.app_role)
);

-- 2. public.checklist_itens
DROP POLICY IF EXISTS "cl_itens_read" ON public.checklist_itens;
DROP POLICY IF EXISTS "cl_itens_insert" ON public.checklist_itens;
DROP POLICY IF EXISTS "cl_itens_update" ON public.checklist_itens;
DROP POLICY IF EXISTS "cl_itens_delete" ON public.checklist_itens;

CREATE POLICY "cl_itens_read"
ON public.checklist_itens
FOR SELECT
TO authenticated
USING (
  private.is_mestre(auth.uid())
  OR private.is_gestor_or_admin(auth.uid())
  OR private.has_role(auth.uid(), 'tecnico'::public.app_role)
  OR private.has_role(auth.uid(), 'responsavel'::public.app_role)
);

CREATE POLICY "cl_itens_insert"
ON public.checklist_itens
FOR INSERT
TO authenticated
WITH CHECK (
  private.is_mestre(auth.uid())
  OR private.is_gestor_or_admin(auth.uid())
  OR private.has_role(auth.uid(), 'tecnico'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.checklists c
    WHERE c.id = checklist_itens.checklist_id
      AND c.criado_por = auth.uid()
  )
);

CREATE POLICY "cl_itens_update"
ON public.checklist_itens
FOR UPDATE
TO authenticated
USING (
  private.is_mestre(auth.uid())
  OR private.is_gestor_or_admin(auth.uid())
  OR private.has_role(auth.uid(), 'tecnico'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.checklists c
    WHERE c.id = checklist_itens.checklist_id
      AND c.criado_por = auth.uid()
  )
)
WITH CHECK (
  private.is_mestre(auth.uid())
  OR private.is_gestor_or_admin(auth.uid())
  OR private.has_role(auth.uid(), 'tecnico'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.checklists c
    WHERE c.id = checklist_itens.checklist_id
      AND c.criado_por = auth.uid()
  )
);

CREATE POLICY "cl_itens_delete"
ON public.checklist_itens
FOR DELETE
TO authenticated
USING (
  private.is_mestre(auth.uid())
  OR private.is_gestor_or_admin(auth.uid())
  OR private.has_role(auth.uid(), 'tecnico'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.checklists c
    WHERE c.id = checklist_itens.checklist_id
      AND c.criado_por = auth.uid()
  )
);

-- 3. public.checklist_respostas
DROP POLICY IF EXISTS "cl_resp_read" ON public.checklist_respostas;
DROP POLICY IF EXISTS "cl_resp_insert" ON public.checklist_respostas;
DROP POLICY IF EXISTS "cl_resp_update" ON public.checklist_respostas;

CREATE POLICY "cl_resp_read"
ON public.checklist_respostas
FOR SELECT
TO authenticated
USING (
  private.is_mestre(auth.uid())
  OR private.is_gestor_or_admin(auth.uid())
  OR private.has_role(auth.uid(), 'tecnico'::public.app_role)
  OR private.has_role(auth.uid(), 'responsavel'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.checklist_execucoes e
    WHERE e.id = checklist_respostas.execucao_id
      AND e.usuario_id = auth.uid()
  )
);

CREATE POLICY "cl_resp_insert"
ON public.checklist_respostas
FOR INSERT
TO authenticated
WITH CHECK (
  private.is_mestre(auth.uid())
  OR private.is_gestor_or_admin(auth.uid())
  OR private.has_role(auth.uid(), 'tecnico'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.checklist_execucoes e
    WHERE e.id = checklist_respostas.execucao_id
      AND e.usuario_id = auth.uid()
  )
);

CREATE POLICY "cl_resp_update"
ON public.checklist_respostas
FOR UPDATE
TO authenticated
USING (
  private.is_mestre(auth.uid())
  OR private.is_gestor_or_admin(auth.uid())
  OR private.has_role(auth.uid(), 'tecnico'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.checklist_execucoes e
    WHERE e.id = checklist_respostas.execucao_id
      AND e.usuario_id = auth.uid()
  )
)
WITH CHECK (
  private.is_mestre(auth.uid())
  OR private.is_gestor_or_admin(auth.uid())
  OR private.has_role(auth.uid(), 'tecnico'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.checklist_execucoes e
    WHERE e.id = checklist_respostas.execucao_id
      AND e.usuario_id = auth.uid()
  )
);

-- 4. public.equipamento_componentes
DROP POLICY IF EXISTS "equip_comp_read" ON public.equipamento_componentes;
DROP POLICY IF EXISTS "equip_comp_insert" ON public.equipamento_componentes;
DROP POLICY IF EXISTS "equip_comp_update" ON public.equipamento_componentes;

CREATE POLICY "equip_comp_read"
ON public.equipamento_componentes
FOR SELECT
TO authenticated
USING (
  private.is_mestre(auth.uid())
  OR private.is_gestor_or_admin(auth.uid())
  OR private.has_role(auth.uid(), 'tecnico'::public.app_role)
  OR private.has_role(auth.uid(), 'responsavel'::public.app_role)
);

CREATE POLICY "equip_comp_insert"
ON public.equipamento_componentes
FOR INSERT
TO authenticated
WITH CHECK (
  (
    private.is_mestre(auth.uid())
    OR private.is_gestor_or_admin(auth.uid())
    OR private.has_role(auth.uid(), 'tecnico'::public.app_role)
    OR private.has_role(auth.uid(), 'responsavel'::public.app_role)
  )
  AND (criado_por IS NULL OR criado_por = auth.uid())
);

CREATE POLICY "equip_comp_update"
ON public.equipamento_componentes
FOR UPDATE
TO authenticated
USING (
  private.is_mestre(auth.uid())
  OR private.is_gestor_or_admin(auth.uid())
  OR private.has_role(auth.uid(), 'tecnico'::public.app_role)
  OR private.has_role(auth.uid(), 'responsavel'::public.app_role)
)
WITH CHECK (
  private.is_mestre(auth.uid())
  OR private.is_gestor_or_admin(auth.uid())
  OR private.has_role(auth.uid(), 'tecnico'::public.app_role)
  OR private.has_role(auth.uid(), 'responsavel'::public.app_role)
);

-- 5. public.os_edicao_permissoes
DROP POLICY IF EXISTS "Autenticados leem permissoes de edicao" ON public.os_edicao_permissoes;

CREATE POLICY "Autenticados leem permissoes de edicao"
ON public.os_edicao_permissoes
FOR SELECT
TO authenticated
USING (
  private.is_mestre(auth.uid())
  OR private.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = os_edicao_permissoes.role
  )
);

-- 6. public.notificacao_config
DROP POLICY IF EXISTS "config leitura" ON public.notificacao_config;

CREATE POLICY "config leitura"
ON public.notificacao_config
FOR SELECT
TO authenticated
USING (
  private.is_mestre(auth.uid())
  OR private.is_admin(auth.uid())
);

-- 7. storage.objects (comprovantes_select)
DROP POLICY IF EXISTS "comprovantes_select" ON storage.objects;

CREATE POLICY "comprovantes_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'comprovantes'
  AND (
    owner_id = (SELECT auth.uid()::text)
    OR owner = auth.uid()
    OR private.is_mestre(auth.uid())
    OR private.is_gestor_or_admin(auth.uid())
    OR private.has_role(auth.uid(), 'tecnico'::public.app_role)
    OR private.has_role(auth.uid(), 'responsavel'::public.app_role)
  )
);