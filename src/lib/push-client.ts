import { getVapidPublicKey, registrarDispositivo } from "./push.functions";

export const PUSH_SW_URL = "/push-sw.js";

function base64UrlParaUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSuportado(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function permissaoAtual(): NotificationPermission | "indisponivel" {
  if (typeof window === "undefined" || !("Notification" in window)) return "indisponivel";
  return Notification.permission;
}

export function nomeDispositivoPadrao(): string {
  if (typeof navigator === "undefined") return "Dispositivo";
  const ua = navigator.userAgent;
  if (/iPad/i.test(ua)) return "iPad";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? "Celular Android" : "Tablet Android";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Computador Windows";
  return "Dispositivo";
}

export async function registrarServiceWorker(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register(PUSH_SW_URL, { scope: "/" });
  await navigator.serviceWorker.ready;
  return reg;
}

export async function assinaturaAtual(): Promise<PushSubscription | null> {
  if (!pushSuportado()) return null;
  const reg = await navigator.serviceWorker.getRegistration(PUSH_SW_URL);
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

function chaveBase64(sub: PushSubscription, nome: "p256dh" | "auth"): string {
  const key = sub.getKey(nome);
  if (!key) throw new Error("Não foi possível ler as chaves do dispositivo.");
  return btoa(String.fromCharCode(...new Uint8Array(key)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function ativarNotificacoesNesteDispositivo(nome?: string) {
  if (!pushSuportado()) throw new Error("Este navegador não suporta notificações push.");

  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") throw new Error("Permissão de notificações negada no aparelho.");

  const reg = await registrarServiceWorker();
  const { publicKey } = await getVapidPublicKey();
  if (!publicKey) throw new Error("Servidor sem chave de push configurada.");

  let sub = await reg.pushManager.getSubscription();
  if (sub) {
    const atual = sub.options?.applicationServerKey;
    const mesma =
      atual &&
      btoa(String.fromCharCode(...new Uint8Array(atual)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "") === publicKey;
    if (!mesma) {
      await sub.unsubscribe();
      sub = null;
    }
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlParaUint8Array(publicKey) as BufferSource,
    });
  }

  const res = await registrarDispositivo({
    data: {
      endpoint: sub.endpoint,
      p256dh: chaveBase64(sub, "p256dh"),
      auth: chaveBase64(sub, "auth"),
      nome: nome || nomeDispositivoPadrao(),
      userAgent: navigator.userAgent.slice(0, 400),
    },
  });
  return res.device;
}

export async function desativarNesteDispositivo() {
  const sub = await assinaturaAtual();
  if (sub) await sub.unsubscribe();
}
