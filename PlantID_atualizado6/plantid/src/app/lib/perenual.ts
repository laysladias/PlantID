// Integração com a API externa Perenual (catálogo de plantas).
// Documentação: https://perenual.com/docs/api
// A chave fica em uma variável de ambiente (nunca direto no código),
// configurada no Netlify e no .env local como VITE_PERENUAL_API_KEY.

const PERENUAL_BASE_URL = "https://perenual.com/api/v2";
const API_KEY = import.meta.env.VITE_PERENUAL_API_KEY as string | undefined;
const API_ID_UUID_PREFIX = "00000000-0000-0000-0000-";

export interface PerenualPlant {
  id: string;
  name: string;
  scientificName: string;
  image: string;
}

export interface PerenualPlantDetails extends PerenualPlant {
  description: string;
  watering: string;
  wateringFrequency: string;
  sunlight: string;
  lightRequirement: string;
  lightIntensityMin: number | null;
  lightIntensityMax: number | null;
  fertilization: string;
  careLevel: string;
  cycle: string;
  indoor: boolean;
  poisonousToPets: boolean;
  poisonousToHumans: boolean;
}

/**
 * A tabela user_plants já existente usa UUID em plant_id, enquanto a
 * Perenual identifica espécies por números. Este UUID determinístico mantém
 * a compatibilidade com o banco sem perder o ID original da API.
 */
export function toStoredPlantId(perenualId: string | number): string {
  const value = String(perenualId).replace(/\D/g, "").slice(-12).padStart(12, "0");
  return `${API_ID_UUID_PREFIX}${value}`;
}

export function toPerenualId(storedId: string | number): string {
  const value = String(storedId);
  if (value.startsWith(API_ID_UUID_PREFIX)) {
    return String(Number(value.slice(API_ID_UUID_PREFIX.length)));
  }
  return value;
}

function pickImage(item: any): string {
  const img = item?.default_image;
  return img?.medium_url || img?.regular_url || img?.thumbnail || img?.small_url || "";
}

const SEARCH_TRANSLATIONS: Record<string, string> = {
  "espada de sao jorge": "snake plant",
  "espada de são jorge": "snake plant",
  "costela de adao": "monstera",
  "costela de adão": "monstera",
  jiboia: "pothos",
  "lingua de sogra": "snake plant",
  "língua de sogra": "snake plant",
  lirio: "peace lily",
  lírio: "peace lily",
  "lirio da paz": "peace lily",
  "lírio da paz": "peace lily",
  zamioculca: "zz plant",
  suculenta: "succulent",
  suculentas: "succulent",
  cacto: "cactus",
  cactos: "cactus",
  samambaia: "fern",
  orquidea: "orchid",
  orquídea: "orchid",
  babosa: "aloe vera",
  "comigo ninguem pode": "dumb cane",
  "comigo ninguém pode": "dumb cane",
  lavanda: "lavender",
  manjericao: "basil",
  manjericão: "basil",
  alecrim: "rosemary",
};

const NAME_TRANSLATIONS: Record<string, string> = {
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

const WORD_TRANSLATIONS: Record<string, string> = {
  frequent: "Frequente",
  average: "Moderada",
  minimum: "Mínima",
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  "part shade": "Meia-sombra",
  "partial shade": "Meia-sombra",
  shade: "Sombra",
  "full shade": "Sombra",
  "full sun": "Sol pleno",
  sunlight: "Luz solar",
  spring: "Primavera",
  summer: "Verão",
  autumn: "Outono",
  fall: "Outono",
  winter: "Inverno",
  perennial: "Perene",
  annual: "Anual",
  biennial: "Bienal",
  easy: "Fácil",
  difficult: "Difícil",
};

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function translatePlantSearch(query: string): string {
  const trimmed = query.trim();
  return SEARCH_TRANSLATIONS[normalize(trimmed)] ?? trimmed;
}

function translateValue(value: unknown, fallback = "Não informado"): string {
  if (value == null || String(value).trim() === "") return fallback;
  const text = String(value);
  return text
    .split(/(, |; |\.|\n)/g)
    .map((part) => {
      const key = normalize(part);
      return WORD_TRANSLATIONS[key] ?? part;
    })
    .join("")
    .replace(/\bPart shade\b/gi, "Meia-sombra")
    .replace(/\bPartial shade\b/gi, "Meia-sombra")
    .replace(/\bFull sun\b/gi, "Sol pleno")
    .replace(/\bFrequent\b/gi, "Frequente")
    .replace(/\bAverage\b/gi, "Moderada")
    .replace(/\bLow\b/gi, "Baixa")
    .replace(/\bMedium\b/gi, "Média")
    .replace(/\bHigh\b/gi, "Alta");
}

async function translateFromEnglish(value: unknown, fallback = "Não informado"): Promise<string> {
  const original = value == null ? "" : String(value).trim();
  if (!original) return fallback;

  const local = translateValue(original, "");
  // Para descrições completas, tenta traduzir no navegador e mantém o texto
  // original como fallback caso o serviço de tradução esteja indisponível.
  if (local !== original && !/[a-z]{4,}/i.test(original.replace(/\b(full|part|shade|sun)\b/gi, ""))) {
    return local;
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(original.slice(0, 4500))}`;
    const response = await fetch(url);
    if (!response.ok) return local || original;
    const data = await response.json();
    const translated = Array.isArray(data?.[0])
      ? data[0].map((part: any[]) => part?.[0] ?? "").join("").trim()
      : "";
    return translated || local || original;
  } catch {
    return local || original;
  }
}

function translateName(value: unknown, scientificName: string): string {
  const original = String(value || scientificName || "Planta sem nome").trim();
  return NAME_TRANSLATIONS[normalize(original)] ?? original;
}

async function translatePlantName(value: unknown, scientificName: string): Promise<string> {
  const original = String(value || scientificName || "Planta sem nome").trim();
  const known = translateName(original, scientificName);
  if (known !== original) return known;
  return translateFromEnglish(original, original);
}

function sunlightRange(sunlight: unknown): { min: number | null; max: number | null; requirement: string } {
  const values = Array.isArray(sunlight) ? sunlight : sunlight ? [sunlight] : [];
  const text = values.join(", ").toLowerCase();
  if (!text) return { min: null, max: null, requirement: "Não informado" };
  if (text.includes("full sun")) return { min: 5000, max: 20000, requirement: "Sol pleno" };
  if (text.includes("part shade") || text.includes("partial shade")) {
    return { min: 1000, max: 5000, requirement: "Meia-sombra" };
  }
  if (text.includes("shade")) return { min: 100, max: 1000, requirement: "Sombra" };
  return { min: 1000, max: 5000, requirement: translateValue(values.join(", ")) };
}

async function mapListItem(item: any): Promise<PerenualPlant> {
  const scientificName = item.scientific_name?.[0] || "";
  return {
    id: String(item.id),
    name: await translatePlantName(item.common_name, scientificName),
    scientificName,
    image: pickImage(item),
  };
}

/** Busca plantas por nome na Perenual. */
export async function searchPerenualPlants(query: string): Promise<PerenualPlant[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  if (!API_KEY) {
    console.error("VITE_PERENUAL_API_KEY não configurada — configure a variável de ambiente.");
    return [];
  }

  try {
    const apiQuery = translatePlantSearch(trimmed);
    const url = `${PERENUAL_BASE_URL}/species-list?key=${API_KEY}&q=${encodeURIComponent(apiQuery)}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Erro na busca da Perenual:", res.status);
      return [];
    }
    const json = await res.json();
    return Promise.all((json.data ?? []).map(mapListItem));
  } catch (err) {
    console.error("Erro de rede ao buscar na Perenual:", err);
    return [];
  }
}

/** Busca os detalhes completos de uma planta pelo ID Perenual ou pelo UUID salvo. */
export async function getPerenualPlantDetails(
  id: string | number
): Promise<PerenualPlantDetails | null> {
  if (!API_KEY) {
    console.error("VITE_PERENUAL_API_KEY não configurada — configure a variável de ambiente.");
    return null;
  }

  try {
    const apiId = toPerenualId(id);
    const url = `${PERENUAL_BASE_URL}/species/details/${apiId}?key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Erro ao buscar detalhes na Perenual:", res.status);
      return null;
    }
    const item = await res.json();
    const scientificName = item.scientific_name?.[0] || "";
    const sunlight = sunlightRange(item.sunlight);
    const benchmark = item.watering_general_benchmark;
    const wateringFrequency = benchmark?.value
      ? `${benchmark.value} ${translateValue(benchmark.unit, "dias")}`
      : translateValue(item.watering);
    const [name, description, watering, sunlightText, careLevel, cycle] = await Promise.all([
      translatePlantName(item.common_name, scientificName),
      translateFromEnglish(
        item.description,
        "Ainda não temos uma descrição detalhada para essa planta."
      ),
      translateFromEnglish(item.watering),
      translateFromEnglish(
        Array.isArray(item.sunlight) ? item.sunlight.join(", ") : item.sunlight
      ),
      translateFromEnglish(item.care_level),
      translateFromEnglish(item.cycle),
    ]);

    return {
      id: String(item.id),
      name,
      scientificName,
      image: pickImage(item),
      description,
      watering,
      wateringFrequency,
      sunlight: sunlightText,
      lightRequirement: sunlight.requirement,
      lightIntensityMin: sunlight.min,
      lightIntensityMax: sunlight.max,
      fertilization: "A cada 30 dias",
      careLevel,
      cycle,
      indoor: !!item.indoor,
      poisonousToPets: !!item.poisonous_to_pets,
      poisonousToHumans: !!item.poisonous_to_humans,
    };
  } catch (err) {
    console.error("Erro de rede ao buscar detalhes na Perenual:", err);
    return null;
  }
}

/** Retorna apenas o nome traduzido de uma espécie já salva na coleção. */
export async function getPerenualPlantName(
  id: string | number,
  fallback = "Planta"
): Promise<string> {
  if (!API_KEY) return fallback;
  try {
    const apiId = toPerenualId(id);
    const res = await fetch(`${PERENUAL_BASE_URL}/species/details/${apiId}?key=${API_KEY}`);
    if (!res.ok) return fallback;
    const item = await res.json();
    return await translatePlantName(item.common_name, item.scientific_name?.[0] || "");
  } catch {
    return fallback;
  }
}
