// Ajuda a contornar o fato de a Perenual só entender nomes/termos em inglês.
// 1) Antes de buscar, tenta traduzir o termo digitado (pt) para inglês.
// 2) Depois de buscar os detalhes, traduz os campos de texto livre e usa
//    dicionários para os campos de valores fixos (watering, sunlight etc.).

const TRANSLATE_ENDPOINT = "https://api.mymemory.translated.net/get";

async function translate(text: string, langpair: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;

  try {
    const url = `${TRANSLATE_ENDPOINT}?q=${encodeURIComponent(trimmed)}&langpair=${langpair}`;
    const res = await fetch(url);
    if (!res.ok) return text;
    const json = await res.json();
    const translated = json?.responseData?.translatedText;
    return translated && typeof translated === "string" ? translated : text;
  } catch {
    // Sem internet, serviço fora do ar etc. — devolve o texto original
    // pra busca/exibição não travar por causa da tradução.
    return text;
  }
}

export function translateToEnglish(text: string): Promise<string> {
  return translate(text, "pt|en");
}

export function translateToPortuguese(text: string): Promise<string> {
  return translate(text, "en|pt");
}

// Dicionários pros valores fixos que a Perenual devolve (mais rápido e
// confiável do que tradução automática pra palavras únicas conhecidas).
const WATERING_PT: Record<string, string> = {
  frequent: "Frequente",
  average: "Moderada",
  minimum: "Mínima",
  none: "Quase nenhuma",
};

const SUNLIGHT_PT: Record<string, string> = {
  "full sun": "Sol pleno",
  "part sun": "Sol parcial",
  "part shade": "Meia-sombra",
  "full shade": "Sombra total",
  "filtered shade": "Sombra filtrada",
  "filtered sun": "Sol filtrado",
  "sun-part shade": "Sol a meia-sombra",
};

const CARE_LEVEL_PT: Record<string, string> = {
  high: "Alto",
  medium: "Médio",
  moderate: "Médio",
  low: "Baixo",
  none: "Não informado",
};

function lookup(dict: Record<string, string>, value: string): string {
  const key = value.trim().toLowerCase();
  return dict[key] ?? value;
}

export function translateWatering(value: string): string {
  return lookup(WATERING_PT, value);
}

export function translateSunlight(value: string): string {
  // "sunlight" pode vir com várias opções separadas por vírgula.
  return value
    .split(",")
    .map((part) => lookup(SUNLIGHT_PT, part))
    .join(", ");
}

export function translateCareLevel(value: string): string {
  return lookup(CARE_LEVEL_PT, value);
}
