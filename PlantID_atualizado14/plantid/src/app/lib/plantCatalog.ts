// Catálogo de plantas = tabela "plants" do Supabase.
// Ela é alimentada pela IA: toda planta gerada pela IA é salva aqui, então a
// próxima busca pela mesma planta é instantânea e a ficha fica sempre igual.

import { cacheGet } from "./cache";
import { getPlants, getPlantById, Plant } from "./db";
import type { ExtraDetails } from "./plantDetails";

const LOCAL_ID_PREFIX = "local:";
export const AI_CACHE_ID_PREFIX = "ai:";

export interface CatalogPlant {
  id: string;
  name: string;
  scientificName: string;
  image: string;
}

export interface PlantDetails extends CatalogPlant {
  description: string;
  watering: string;
  wateringFrequency: string;
  sunlight: string;
  careLevel: string;
  fertilization: string;
  idealTemperature: string;
  humidity: string;
  soilType: string;
  toxicityLevel: string;
  toxicitySymptoms: string;
  poisonousToPets: boolean;
  poisonousToHumans: boolean;
  aiGenerated: boolean;
  extra?: ExtraDetails | null;
}

export function normalizeForSearch(value: string): string {
  return value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function plantToListItem(plant: Plant): CatalogPlant {
  return {
    id: `${LOCAL_ID_PREFIX}${plant.id}`,
    name: plant.name,
    scientificName: plant.scientificName || "",
    image: plant.images?.[0] || "",
  };
}

export function plantToDetails(plant: Plant): PlantDetails {
  const level = plant.toxicity?.level || "";
  return {
    id: `${LOCAL_ID_PREFIX}${plant.id}`,
    name: plant.name,
    scientificName: plant.scientificName || "",
    image: plant.images?.[0] || "",
    description: plant.description || "Ainda não temos uma descrição detalhada para essa planta.",
    watering: plant.wateringFrequency || "Não informado",
    wateringFrequency: plant.wateringFrequency || "A cada 7 dias",
    sunlight: plant.lightRequirement || "Não informado",
    careLevel: plant.careLevel || "Não informado",
    fertilization: plant.fertilization || "A cada 30 dias",
    idealTemperature: plant.idealTemperature || "",
    humidity: plant.humidity || "",
    soilType: plant.soilType || "",
    toxicityLevel: level,
    toxicitySymptoms: plant.toxicity?.symptoms || "",
    poisonousToPets: !!(plant.toxicity?.dangerousToDogs || plant.toxicity?.dangerousToCats),
    poisonousToHumans: !!plant.toxicity?.dangerousToOther || level.toLowerCase() === "alta",
    aiGenerated: !!plant.aiGenerated,
    extra: plant.extraDetails ?? null,
  };
}

/**
 * Busca no catálogo pelo COMEÇO do que a pessoa digitou.
 * Ex.: "sa" mostra só plantas cujo nome (ou nome científico, ou apelido)
 * começa com "sa" — e vai afunilando a cada letra. Maiúsculas e acentos
 * não importam ("sao" encontra "São Jorge").
 */
export async function searchPlants(query: string): Promise<CatalogPlant[]> {
  const term = normalizeForSearch(query);
  if (!term) return [];
  const all = await getPlants();

  const scored: { plant: Plant; rank: number; name: string }[] = [];

  for (const p of all) {
    const name = normalizeForSearch(p.name || "");
    const scientific = normalizeForSearch(p.scientificName || "");
    const aliases = (p.aliases || "")
      .split("|")
      .map((a) => normalizeForSearch(a))
      .filter(Boolean);

    let rank = -1;
    if (name === term) rank = 0;
    else if (name.startsWith(term)) rank = 1;
    else if (aliases.some((a) => a === term)) rank = 2;
    else if (aliases.some((a) => a.startsWith(term))) rank = 3;
    else if (scientific.startsWith(term)) rank = 4;
    else if (name.length >= 3 && term.startsWith(name)) rank = 5; // "rosas" encontra "Rosa"

    if (rank >= 0) scored.push({ plant: p, rank, name });
  }

  scored.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "pt-BR"));
  return scored.map((x) => plantToListItem(x.plant));
}

/** Detalhes de uma planta: do banco ("local:...") ou da ficha de IA ainda não salva ("ai:..."). */
export async function getPlantDetails(id: string | number): Promise<PlantDetails | null> {
  const idStr = String(id);

  if (idStr.startsWith(LOCAL_ID_PREFIX)) {
    const plant = await getPlantById(idStr.slice(LOCAL_ID_PREFIX.length));
    return plant ? plantToDetails(plant) : null;
  }

  if (idStr.startsWith(AI_CACHE_ID_PREFIX)) {
    return cacheGet<PlantDetails>(`aiplant:${idStr}`);
  }

  return null;
}
