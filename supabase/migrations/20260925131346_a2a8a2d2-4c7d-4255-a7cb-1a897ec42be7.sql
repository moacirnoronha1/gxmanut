CREATE OR REPLACE FUNCTION public.tg_identificar_autor_manutencao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sessão expirada.'; END IF;

  IF TG_TABLE_NAME = 'manutencoes_periodicas' THEN
    IF TG_OP = 'INSERT' THEN NEW.criado_por := v_user;
    ELSE NEW.criado_por := OLD.criado_por;
    END IF;
    NEW.atualizado_por := v_user;
  ELSIF TG_TABLE_NAME = 'mp_execucoes' THEN
    IF TG_OP = 'INSERT' THEN NEW.criado_por := v_user;
    ELSE NEW.criado_por := OLD.criado_por;
    END IF;
    NEW.atualizado_por := v_user;
  ELSIF TG_TABLE_NAME = 'mp_reagendamentos' THEN
    NEW.usuario_id := v_user;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.tg_identificar_autor_manutencao() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_identificar_autor_manutencao() TO service_role;

CREATE OR REPLACE FUNCTION public.tg_registrar_auditoria_manutencao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_registro uuid;
  v_manutencao uuid;
  v_detalhes jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sessão expirada.'; END IF;

  v_registro := NEW.id;
  IF TG_TABLE_NAME = 'manutencoes_periodicas' THEN v_manutencao := NEW.id;
  ELSE v_manutencao := NEW.manutencao_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_detalhes := jsonb_build_object('novo', to_jsonb(NEW));
  ELSE
    v_detalhes := jsonb_build_object('anterior', to_jsonb(OLD), 'novo', to_jsonb(NEW));
  END IF;

  INSERT INTO public.manutencao_auditoria
    (entidade, registro_id, manutencao_id, usuario_id, acao, detalhes)
  VALUES
    (TG_TABLE_NAME, v_registro, v_manutencao, v_user, lower(TG_OP), v_detalhes);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.tg_registrar_auditoria_manutencao() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tg_registrar_auditoria_manutencao() TO service_role;

DROP TRIGGER IF EXISTS trg_auditar_manutencao_preventiva ON public.manutencoes_periodicas;
CREATE TRIGGER trg_identificar_autor_manutencao
BEFORE INSERT OR UPDATE ON public.manutencoes_periodicas
FOR EACH ROW EXECUTE FUNCTION public.tg_identificar_autor_manutencao();
CREATE TRIGGER trg_auditar_manutencao_preventiva
AFTER INSERT OR UPDATE ON public.manutencoes_periodicas
FOR EACH ROW EXECUTE FUNCTION public.tg_registrar_auditoria_manutencao();

DROP TRIGGER IF EXISTS trg_auditar_mp_execucao ON public.mp_execucoes;
CREATE TRIGGER trg_identificar_autor_mp_execucao
BEFORE INSERT OR UPDATE ON public.mp_execucoes
FOR EACH ROW EXECUTE FUNCTION public.tg_identificar_autor_manutencao();
CREATE TRIGGER trg_auditar_mp_execucao
AFTER INSERT OR UPDATE ON public.mp_execucoes
FOR EACH ROW EXECUTE FUNCTION public.tg_registrar_auditoria_manutencao();

DROP TRIGGER IF EXISTS trg_auditar_mp_reagendamento ON public.mp_reagendamentos;
CREATE TRIGGER trg_identificar_autor_mp_reagendamento
BEFORE INSERT ON public.mp_reagendamentos
FOR EACH ROW EXECUTE FUNCTION public.tg_identificar_autor_manutencao();
CREATE TRIGGER trg_auditar_mp_reagendamento
AFTER INSERT ON public.mp_reagendamentos
FOR EACH ROW EXECUTE FUNCTION public.tg_registrar_auditoria_manutencao();

DROP TRIGGER IF EXISTS trg_auditar_mp_lembrete ON public.mp_lembretes;
CREATE TRIGGER trg_auditar_mp_lembrete
AFTER INSERT OR UPDATE ON public.mp_lembretes
FOR EACH ROW EXECUTE FUNCTION public.tg_registrar_auditoria_manutencao();