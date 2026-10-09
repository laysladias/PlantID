// Chama a função do servidor (/api/plant-ai), que pergunta à IA (Groq), e
// salva a ficha gerada no banco para as próximas buscas.

import { supabase } from "./supabase";
import { cacheSet } from "./cache";
import { fetchPlantImage } from "./plantImage";
import { AI_CACHE_ID_PREFIX, PlantDetails, normalizeForSearch } from "./plantCatalog";

export type AiResult =
  | { status: "ok"; plantId: string }
  | { status: "not_found" }
  | { status: "error"; message: string };

interface AiPlant {
  name: string;
  scientificName: string;
  description: string;
  wateringFrequency: string;
  sunlight: string;
  idealTemperature: string;
  humidity: string;
  careLevel: string;
  soilType: string;
  fertilization: string;
  toxicity: { level: string; dogs: boolean; cats: boolean; humans: boolean; symptoms: string | null };
}

const LIGHT_RANGE: Record<string, [number, number]> = {
  "Sol pleno": [5000, 20000],
  "Meia-sombra": [1000, 5000],
  "Luz indireta": [1000, 5000],
  Sombra: [100, 1000],
};

function errorMessage(code: string | undefined, status: number): string {
  if (status === 401 || code === "unauthorized") return "Entre na sua conta para usar a busca com IA.";
  if (status === 429 || code === "rate_limited")
    return "A IA atingiu o limite de pedidos por agora. Tente de novo em alguns instantes.";
  if (code === "missing_groq_key") return "A IA ainda não foi configurada no servidor (falta a chave GROQ_API_KEY).";
  if (status === 404) return "A função de IA não foi encontrada. Confira se o deploy na Vercel incluiu a pasta api.";
  return "Não foi possível gerar a ficha agora. Tente novamente em instantes.";
}

async function callApi(query: string): Promise<{ plant: AiPlant | null } | { error: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  let res: Response;
  try {
    res = await fetch("/api/plant-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ query }),
    });
  } catch {
    return { error: "Sem conexão com o servidor. Verifique sua internet." };
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // resposta sem JSON
  }
  if (!res.ok) return { error: errorMessage(json?.error, res.status) };
  if (!json?.found || !json.plant) return { plant: null };
  return { plant: json.plant as AiPlant };
}

function toRow(plant: AiPlant, image: string, query: string) {
  const [min, max] = LIGHT_RANGE[plant.sunlight] ?? [1000, 5000];
  const aliases = Array.from(
    new Set([normalizeForSearch(query), normalizeForSearch(plant.scientificName)].filter(Boolean))
  ).join("|");
  return {
    name: plant.name,
    scientific_name: plant.scientificName,
    description: plant.description,
    watering_frequency: plant.wateringFrequency,
    light_requirement: plant.sunlight,
    light_intensity_min: min,
    light_intensity_max: max,
    ideal_temperature: plant.idealTemperature,
    humidity: plant.humidity,
    toxicity_level: plant.toxicity.level,
    dangerous_to_dogs: plant.toxicity.dogs,
    dangerous_to_cats: plant.toxicity.cats,
    dangerous_to_other: plant.toxicity.humans,
    toxicity_symptoms: plant.toxicity.symptoms,
    care_level: plant.careLevel,
    soil_type: plant.soilType,
    fertilization: plant.fertilization,
    images: image ? [image] : [],
    aliases,
    ai_generated: true,
  };
}

function slugify(value: string): string {
  return normalizeForSearch(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "planta";
}

/** Gera a ficha com IA e salva no banco. Devolve o id para abrir a tela de detalhes. */
export async function generatePlantWithAI(query: string): Promise<AiResult> {
  const result = await callApi(query);
  if ("error" in result) return { status: "error", message: result.error };
  if (!result.plant) return { status: "not_found" };

  const plant = result.plant;
  const image = await fetchPlantImage(plant.scientificName, plant.name);
  const row = toRow(plant, image, query);

  // Se a IA devolveu uma planta que já existe no banco, reaproveita.
  if (plant.scientificName) {
    const { data: existing } = await supabase
      .from("plants")
      .select("id")
      .ilike("scientific_name", plant.scientificName)
      .limit(1);
    if (existing && existing.length > 0) return { status: "ok", plantId: `local:${existing[0].id}` };
  }

  const { data, error } = await supabase.from("plants").insert(row).select("id").single();
  if (!error && data?.id) return { status: "ok", plantId: `local:${data.id}` };

  // Não conseguiu salvar no banco (ex.: SQL 4 ainda não rodou): mostra a ficha
  // mesmo assim, guardando só neste navegador.
  console.error("Não foi possível salvar a ficha da IA no banco:", error?.message);
  const id = `${AI_CACHE_ID_PREFIX}${slugify(plant.scientificName || plant.name)}`;
  const details: PlantDetails = {
    id,
    name: plant.name,
    scientificName: plant.scientificName,
    image,
    description: plant.description,
    watering: plant.wateringFrequency,
    wateringFrequency: plant.wateringFrequency,
    sunlight: plant.sunlight,
    careLevel: plant.careLevel,
    fertilization: plant.fertilization,
    idealTemperature: plant.idealTemperature,
    humidity: plant.humidity,
    soilType: plant.soilType,
    toxicityLevel: plant.toxicity.level,
    toxicitySymptoms: plant.toxicity.symptoms || "",
    poisonousToPets: plant.toxicity.dogs || plant.toxicity.cats,
    poisonousToHumans: plant.toxicity.humans,
    aiGenerated: true,
  };
  cacheSet(`aiplant:${id}`, details, 30 * 24 * 60 * 60 * 1000);
  return { status: "ok", plantId: id };
}
