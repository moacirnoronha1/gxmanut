// Regras de login por nome de usuário (sem e-mail real).
// Puro e sem dependências: pode rodar no navegador e no servidor.
export const USER_DOMAIN = "xica.local";

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase().replace(/\s+/g, "");
}

export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${USER_DOMAIN}`;
}
