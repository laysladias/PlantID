// Cache simples no navegador (localStorage) para economizar chamadas às APIs
// externas (fotos da Wikipédia e fichas geradas pela IA). Se o localStorage não estiver
// disponível, tudo continua funcionando, só sem cache.

const PREFIX = "plantid:cache:";

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { exp: number; value: T };
    if (!parsed || parsed.exp < Date.now()) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

export function cacheSet<T>(key: string, value: T, ttlMs = 7 * 24 * 60 * 60 * 1000): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ exp: Date.now() + ttlMs, value }));
  } catch {
    // Sem espaço ou bloqueado — ignora, o app segue sem cache.
  }
}
