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

// Dicionário de nomes comuns conhecidos — evita depender do serviço de
// tradução automática (mais rápido e confiável) para os casos mais comuns
// de busca. Quando o termo não está aqui, cai no translateToEnglish acima.
const SEARCH_NAME_DICTIONARY: Record<string, string> = {
  "espada de sao jorge": "snake plant",
  "espada-de-sao-jorge": "snake plant",
  "lingua de sogra": "snake plant",
  "costela de adao": "monstera",
  "costela-de-adao": "monstera",
  jiboia: "pothos",
  lirio: "peace lily",
  "lirio da paz": "peace lily",
  zamioculca: "zz plant",
  suculenta: "succulent",
  suculentas: "succulent",
  cacto: "cactus",
  cactos: "cactus",
  samambaia: "fern",
  orquidea: "orchid",
  babosa: "aloe vera",
  "comigo ninguem pode": "dumb cane",
  lavanda: "lavender",
  manjericao: "basil",
  alecrim: "rosemary",
};

const NAME_DICTIONARY_PT: Record<string, string> = {
  "snake plant": "Espada-de-são-jorge",
  "mother-in-law's tongue": "Espada-de-são-jorge",
  pothos: "Jiboia",
  monstera: "Costela-de-adão",
  "peace lily": "Lírio-da-paz",
  "zz plant": "Zamioculca",
  succulent: "Suculenta",
  cactus: "Cacto",
  fern: "Samambaia",
  orchid: "Orquídea",
  "aloe vera": "Babosa",
  "dumb cane": "Comigo-ninguém-pode",
  lavender: "Lavanda",
  basil: "Manjericão",
  rosemary: "Alecrim",
  "spider plant": "Clorofito",
  "rubber plant": "Ficus-borracha",
  "jade plant": "Jade",
};

function normalizeKey(value: string): string {
  return value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Traduz um termo de busca pt→en usando o dicionário primeiro (mais
 * confiável para nomes de planta), caindo no serviço de tradução geral
 * só quando o termo não é conhecido. */
export async function translateSearchTerm(text: string): Promise<string> {
  const known = SEARCH_NAME_DICTIONARY[normalizeKey(text)];
  if (known) return known;
  return translateToEnglish(text);
}

/** Traduz o nome comum de uma planta en→pt, priorizando o dicionário. */
export function translateKnownName(name: string): string | null {
  return NAME_DICTIONARY_PT[normalizeKey(name)] ?? null;
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

const CYCLE_PT: Record<string, string> = {
  perennial: "Perene",
  annual: "Anual",
  biennial: "Bienal",
  biannual: "Bienal",
};

export function translateCycle(value: string): string {
  return value ? lookup(CYCLE_PT, value) : "";
}
