import type { Reminder } from "./db";

const NOTIFIED_TODAY_KEY = "plantid_notified_reminder_ids";

function supportsNotifications(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Estado atual da permissão de notificação, ou null se o navegador não suportar. */
export function getNotificationPermission(): NotificationPermission | null {
  if (!supportsNotifications()) return null;
  return Notification.permission;
}

/**
 * Pede a permissão de notificação ao usuário. Precisa ser chamada a partir de
 * um clique/gesto do usuário (ex: um botão), pois navegadores bloqueiam o
 * pedido automático de permissão sem interação.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!supportsNotifications()) return "denied";
  if (Notification.permission !== "default") return Notification.permission;

  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

async function showNotification(title: string, body: string, tag: string) {
  if (!supportsNotifications() || Notification.permission !== "granted") return;

  // No Android, o construtor "new Notification()" costuma falhar dentro do
  // navegador/PWA — é preciso disparar a notificação através do Service
  // Worker registrado. Em desktop/iOS, cai no fallback abaixo.
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        tag,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
      });
      return;
    } catch {
      // segue para o fallback
    }
  }

  try {
    new Notification(title, { body, tag, icon: "/icon-192.png" });
  } catch {
    // Ambiente não suporta o construtor direto; nada mais a fazer.
  }
}

function getDaysUntil(date: Date): number {
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getNotifiedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_TODAY_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const todayKey = new Date().toDateString();
    if (parsed.day !== todayKey) return new Set();
    return new Set<string>(parsed.ids ?? []);
  } catch {
    return new Set();
  }
}

function saveNotifiedSet(ids: Set<string>) {
  localStorage.setItem(
    NOTIFIED_TODAY_KEY,
    JSON.stringify({ day: new Date().toDateString(), ids: Array.from(ids) })
  );
}

/**
 * Verifica os lembretes ativos e dispara uma notificação para os que vencem
 * hoje ou amanhã, evitando notificar o mesmo lembrete mais de uma vez no
 * mesmo dia. Deve ser chamada ao abrir o app e periodicamente enquanto ele
 * estiver aberto (notificações em segundo plano, com o app fechado, exigem
 * um servidor de push e não são possíveis apenas com hospedagem estática).
 */
export async function checkAndNotifyDueReminders(reminders: Reminder[]) {
  if (getNotificationPermission() !== "granted") return;

  const alreadyNotified = getNotifiedSet();
  const due = reminders.filter((r) => r.enabled && getDaysUntil(r.nextDate) <= 1);

  for (const reminder of due) {
    if (alreadyNotified.has(reminder.id)) continue;

    const daysUntil = getDaysUntil(reminder.nextDate);
    const action = reminder.type === "watering" ? "regar" : "fertilizar";
    const when = daysUntil <= 0 ? "hoje" : "amanhã";

    await showNotification(
      "PlantID — Lembrete de cuidado",
      `Hora de ${action} sua ${reminder.plantName} (${when}).`,
      `reminder-${reminder.id}`
    );

    alreadyNotified.add(reminder.id);
  }

  saveNotifiedSet(alreadyNotified);
}

/** Registra o service worker usado para exibir notificações de forma confiável. */
export function registerNotificationServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => {
    // Falha silenciosa: sem SW, o fallback em showNotification ainda tenta funcionar.
  });
}
