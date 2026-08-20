/* Service worker de mensagens (push) — Manutenção Xica da Silva.
   Não faz cache do app; apenas recebe e exibe notificações. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { titulo: "Manutenção Xica da Silva", mensagem: event.data ? event.data.text() : "" };
  }
  const titulo = data.titulo || "Manutenção Xica da Silva";
  const options = {
    body: data.mensagem || "",
    tag: data.tag || undefined,
    renotify: !!data.tag,
    requireInteraction: data.prioridade === "extrema",
    vibrate: data.prioridade === "extrema" ? [300, 100, 300, 100, 300] : [200, 100, 200],
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/notificacoes", notificacaoId: data.notificacaoId || null },
  };
  event.waitUntil(self.registration.showNotification(titulo, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/notificacoes";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
