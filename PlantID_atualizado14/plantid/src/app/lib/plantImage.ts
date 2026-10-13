// A IA não fornece fotos, então buscamos uma foto na Wikipédia (grátis, sem
// chave). Se não achar, o app mostra um ícone no lugar — nunca quebra.

import { cacheGet, cacheSet } from "./cache";

const TIMEOUT_MS = 4000;

async function wikiThumbnail(lang: string, title: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      title.replace(/\s+/g, "_")
    )}?redirect=true`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.type === "disambiguation") return null;
    const src: string | undefined = json?.thumbnail?.source;
    return src && /^https:\/\//.test(src) ? src : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function cleanScientificName(name: string): string {
  return name
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(spp?|cf|var|subsp)\.?\b/gi, " ")
    .replace(/[×x]\s/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 2)
    .join(" ");
}

export async function fetchPlantImage(scientificName: string, commonName: string): Promise<string> {
  const key = `img:${(scientificName || commonName).toLowerCase()}`;
  const cached = cacheGet<string>(key);
  if (cached !== null) return cached;

  const sci = cleanScientificName(scientificName || "");
  const attempts: Array<[string, string]> = [];
  if (sci) attempts.push(["en", sci], ["pt", sci]);
  if (commonName) attempts.push(["pt", commonName], ["en", commonName]);

  for (const [lang, title] of attempts) {
    const found = await wikiThumbnail(lang, title);
    if (found) {
      cacheSet(key, found, 30 * 24 * 60 * 60 * 1000);
      return found;
    }
  }
  cacheSet(key, "", 24 * 60 * 60 * 1000);
  return "";
}
