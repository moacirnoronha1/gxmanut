REVOKE ALL ON FUNCTION private.responsavel_pelo_setor(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.responsavel_pelo_setor(uuid, uuid) TO authenticated, service_role;