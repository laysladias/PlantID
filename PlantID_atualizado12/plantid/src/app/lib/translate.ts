// Tradução para o português. A Perenual só devolve textos em inglês.
//
// Estratégia (da mais confiável para a menos):
//  1) Dicionários locais (nomes de plantas e valores fixos) — instantâneo.
//  2) Serviço de tradução na internet (Google, depois MyMemory) — com tempo
//     limite, cache no navegador e fallback: se tudo falhar, devolve o texto
//     original em inglês (o app nunca trava por causa da tradução).

import { cacheGet, cacheSet } from "./cache";

const REQUEST_TIMEOUT_MS = 4000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function googleTranslate(text: string, from: string, to: string): Promise<string | null> {
  try {
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx" +
      `&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const json = await res.json();
    const parts = Array.isArray(json?.[0]) ? json[0] : [];
    const translated = parts.map((p: any) => (Array.isArray(p) ? p[0] : "")).join("");
    return translated.trim() ? translated : null;
  } catch {
    return null;
  }
}

function splitIntoChunks(text: string, max = 450): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length > max && current) {
      chunks.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function myMemoryTranslate(text: string, from: string, to: string): Promise<string | null> {
  try {
    const translatedChunks: string[] = [];
    for (const chunk of splitIntoChunks(text)) {
      const url =
        "https://api.mymemory.translated.net/get" +
        `?q=${encodeURIComponent(chunk)}&langpair=${from}|${to}`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) return null;
      const json = await res.json();
      const out = json?.responseData?.translatedText;
      // O MyMemory devolve avisos de limite como se fossem tradução.
      if (
        typeof out !== "string" ||
        !out.trim() ||
        /MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(out) ||
        (json?.responseStatus && Number(json.responseStatus) !== 200)
      ) {
        return null;
      }
      translatedChunks.push(out);
    }
    return translatedChunks.join(" ");
  } catch {
    return null;
  }
}

async function translate(text: string, from: string, to: string, useFallbackService = true): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;

  const cacheKey = `tr:${from}>${to}:${trimmed}`;
  const cached = cacheGet<string>(cacheKey);
  if (cached) return cached;

  let result = await googleTranslate(trimmed, from, to);
  if (!result && useFallbackService) result = await myMemoryTranslate(trimmed, from, to);

  if (result) {
    cacheSet(cacheKey, result, 30 * 24 * 60 * 60 * 1000);
    return result;
  }
  return text;
}

// -------------------------------------------------------------------
// Dicionários de nomes de plantas
// -------------------------------------------------------------------

function normalizeKey(value: string): string {
  return value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// pt (sem acento) -> termo em inglês que a Perenual entende
const SEARCH_NAME_DICTIONARY: Record<string, string> = {
  "espada de sao jorge": "snake plant",
  "lingua de sogra": "snake plant",
  "costela de adao": "monstera",
  jiboia: "pothos",
  lirio: "lily",
  lirios: "lily",
  "lirio da paz": "peace lily",
  zamioculca: "zz plant",
  suculenta: "succulent",
  suculentas: "succulent",
  cacto: "cactus",
  cactos: "cactus",
  samambaia: "fern",
  orquidea: "orchid",
  babosa: "aloe",
  "aloe vera": "aloe vera",
  "comigo ninguem pode": "dieffenbachia",
  lavanda: "lavender",
  manjericao: "basil",
  alecrim: "rosemary",
  hortela: "mint",
  menta: "mint",
  salsa: "parsley",
  cebolinha: "chive",
  coentro: "coriander",
  boldo: "boldo",
  rosa: "rose",
  rosas: "rose",
  roseira: "rose",
  tulipa: "tulip",
  margarida: "daisy",
  girassol: "sunflower",
  cravo: "carnation",
  hortensia: "hydrangea",
  violeta: "violet",
  petunia: "petunia",
  begonia: "begonia",
  geranio: "geranium",
  camelia: "camellia",
  azaleia: "azalea",
  dalia: "dahlia",
  crisantemo: "chrysanthemum",
  jasmim: "jasmine",
  hibisco: "hibiscus",
  papoula: "poppy",
  peonia: "peony",
  anturio: "anthurium",
  "copo de leite": "calla lily",
  bromelia: "bromeliad",
  "amor perfeito": "pansy",
  "boca de leao": "snapdragon",
  verbena: "verbena",
  primavera: "bougainvillea",
  buganvilia: "bougainvillea",
  ipe: "trumpet tree",
  flamboyant: "flamboyant",
  agapanto: "agapanthus",
  gerbera: "gerbera",
  zinia: "zinnia",
  calendula: "calendula",
  amarilis: "amaryllis",
  narciso: "daffodil",
  jacinto: "hyacinth",
  "violeta africana": "african violet",
  palmeira: "palm",
  bambu: "bamboo",
  "pau d agua": "dracaena",
  dracena: "dracaena",
  "ficus": "ficus",
  "ficus lira": "fiddle leaf fig",
  "ficus borracha": "rubber plant",
  clorofito: "spider plant",
  "planta aranha": "spider plant",
  "pata de elefante": "ponytail palm",
  "rabo de burro": "burro's tail",
  jade: "jade plant",
  "planta jade": "jade plant",
  maranta: "prayer plant",
  calateia: "calathea",
  peperomia: "peperomia",
  pilea: "pilea",
  tomate: "tomato",
  morango: "strawberry",
  pimenta: "pepper",
  limoeiro: "lemon tree",
  laranjeira: "orange tree",
  bananeira: "banana",
  abacateiro: "avocado",
  mangueira: "mango",
  goiabeira: "guava",
  pitangueira: "pitanga",
  "arruda": "rue",
  "erva cidreira": "lemon balm",
  capim: "grass",
  grama: "grass",
  trevo: "clover",
  "unha de gato": "cat's claw",
  hera: "ivy",
  heras: "ivy",
  filodendro: "philodendron",
  "singonio": "syngonium",
  tradescantia: "tradescantia",
  "lambari": "tradescantia",
  "coracao roxo": "purple heart",
  "dinheiro em penca": "creeping jenny",
  "chifre de veado": "staghorn fern",
  "avenca": "maidenhair fern",
  "rabo de gato": "chenille plant",
  "alamanda": "allamanda",
  "lantana": "lantana",
  "ixora": "ixora",
  "hemerocale": "daylily",
  "gardenia": "gardenia",
  "magnolia": "magnolia",
  "lotus": "lotus",
  "flor de lotus": "lotus",
  "cerejeira": "cherry blossom",
};

// inglês (minúsculo) -> nome em português
const NAME_DICTIONARY_PT: Record<string, string> = {
  "snake plant": "Espada-de-são-jorge",
  "mother in law s tongue": "Espada-de-são-jorge",
  "mother in law tongue": "Espada-de-são-jorge",
  pothos: "Jiboia",
  "golden pothos": "Jiboia",
  "devil s ivy": "Jiboia",
  monstera: "Costela-de-adão",
  "swiss cheese plant": "Costela-de-adão",
  "peace lily": "Lírio-da-paz",
  "zz plant": "Zamioculca",
  "zanzibar gem": "Zamioculca",
  succulent: "Suculenta",
  cactus: "Cacto",
  fern: "Samambaia",
  "boston fern": "Samambaia",
  orchid: "Orquídea",
  "moth orchid": "Orquídea",
  "aloe vera": "Babosa",
  aloe: "Babosa",
  "dumb cane": "Comigo-ninguém-pode",
  dieffenbachia: "Comigo-ninguém-pode",
  lavender: "Lavanda",
  basil: "Manjericão",
  "sweet basil": "Manjericão",
  rosemary: "Alecrim",
  mint: "Hortelã",
  peppermint: "Hortelã",
  spearmint: "Hortelã",
  parsley: "Salsa",
  chives: "Cebolinha",
  chive: "Cebolinha",
  coriander: "Coentro",
  cilantro: "Coentro",
  rose: "Rosa",
  tulip: "Tulipa",
  daisy: "Margarida",
  sunflower: "Girassol",
  carnation: "Cravo",
  hydrangea: "Hortênsia",
  violet: "Violeta",
  petunia: "Petúnia",
  begonia: "Begônia",
  geranium: "Gerânio",
  camellia: "Camélia",
  azalea: "Azaleia",
  dahlia: "Dália",
  chrysanthemum: "Crisântemo",
  jasmine: "Jasmim",
  hibiscus: "Hibisco",
  poppy: "Papoula",
  peony: "Peônia",
  anthurium: "Antúrio",
  "calla lily": "Copo-de-leite",
  bromeliad: "Bromélia",
  pansy: "Amor-perfeito",
  snapdragon: "Boca-de-leão",
  verbena: "Verbena",
  bougainvillea: "Primavera (Buganvília)",
  agapanthus: "Agapanto",
  gerbera: "Gérbera",
  zinnia: "Zínia",
  calendula: "Calêndula",
  amaryllis: "Amarílis",
  daffodil: "Narciso",
  hyacinth: "Jacinto",
  "african violet": "Violeta-africana",
  lily: "Lírio",
  "spider plant": "Clorofito",
  "rubber plant": "Ficus-borracha",
  "rubber tree": "Ficus-borracha",
  "fiddle leaf fig": "Ficus-lira",
  "jade plant": "Árvore-jade",
  "prayer plant": "Maranta",
  calathea: "Calatéia",
  peperomia: "Peperômia",
  "chinese money plant": "Pilea",
  pilea: "Pilea",
  "ponytail palm": "Pata-de-elefante",
  "burro s tail": "Rabo-de-burro",
  "english ivy": "Hera",
  ivy: "Hera",
  bamboo: "Bambu",
  philodendron: "Filodendro",
  tomato: "Tomate",
  strawberry: "Morango",
  "lemon balm": "Erva-cidreira",
  lotus: "Flor-de-lótus",
  gardenia: "Gardênia",
  magnolia: "Magnólia",
  "maidenhair fern": "Avenca",
  "staghorn fern": "Chifre-de-veado",
  "purple heart": "Coração-roxo",
};

/** Traduz um termo de busca pt→en: dicionário primeiro, internet depois. */
export async function translateSearchTerm(text: string): Promise<string> {
  const known = SEARCH_NAME_DICTIONARY[normalizeKey(text)];
  if (known) return known;
  return translate(text, "pt", "en");
}

/** Nome em português se estiver no dicionário (ou null). */
export function translateKnownName(name: string): string | null {
  return NAME_DICTIONARY_PT[normalizeKey(name)] ?? null;
}

/** Traduz o nome comum de uma planta: dicionário → internet (com cache). */
export async function translatePlantName(name: string): Promise<string> {
  const known = translateKnownName(name);
  if (known) return known;
  const translated = await translate(name, "en", "pt", false);
  // Deixa a primeira letra maiúscula, como no resto do app.
  return translated.charAt(0).toLocaleUpperCase("pt-BR") + translated.slice(1);
}

/** Traduz textos longos (descrições) en→pt. */
export function translateToPortuguese(text: string): Promise<string> {
  return translate(text, "en", "pt");
}

// -------------------------------------------------------------------
// Valores fixos que a Perenual devolve
// -------------------------------------------------------------------

const WATERING_PT: Record<string, string> = {
  frequent: "Frequente",
  average: "Moderada",
  minimum: "Mínima",
  none: "Quase nenhuma",
};

const WATERING_DEFAULT_FREQUENCY: Record<string, string> = {
  frequent: "A cada 3 dias",
  average: "A cada 7 dias",
  minimum: "A cada 14 dias",
  none: "A cada 21 dias",
};

const SUNLIGHT_PT: Record<string, string> = {
  "full sun": "Sol pleno",
  "part sun": "Sol parcial",
  "part shade": "Meia-sombra",
  "full shade": "Sombra total",
  "filtered shade": "Sombra filtrada",
  "filtered sun": "Sol filtrado",
  "sun-part shade": "Sol a meia-sombra",
  "sun part shade": "Sol a meia-sombra",
  "part sun part shade": "Sol parcial / meia-sombra",
  "deep shade": "Sombra total",
};

const CARE_LEVEL_PT: Record<string, string> = {
  high: "Alto",
  medium: "Médio",
  moderate: "Médio",
  low: "Baixo",
  none: "Não informado",
};

const CYCLE_PT: Record<string, string> = {
  perennial: "Perene",
  annual: "Anual",
  biennial: "Bienal",
  biannual: "Bienal",
};

function lookup(dict: Record<string, string>, value: string): string {
  const key = value.trim().toLowerCase();
  return dict[key] ?? value;
}

export function translateWatering(value: string): string {
  return lookup(WATERING_PT, value);
}

/** Frequência em dias sugerida a partir do rótulo qualitativo da Perenual. */
export function defaultWateringFrequency(value: string): string | null {
  return WATERING_DEFAULT_FREQUENCY[value.trim().toLowerCase()] ?? null;
}

export function translateSunlight(value: string): string {
  return value
    .split(",")
    .map((part) => lookup(SUNLIGHT_PT, part))
    .join(", ");
}

export function translateCareLevel(value: string): string {
  return lookup(CARE_LEVEL_PT, value);
}

export function translateCycle(value: string): string {
  return value ? lookup(CYCLE_PT, value) : "";
}
