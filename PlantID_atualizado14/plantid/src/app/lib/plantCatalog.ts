// Catálogo de plantas = tabela "plants" do Supabase.
// Ela é alimentada pela IA: toda planta gerada pela IA é salva aqui, então a
// próxima busca pela mesma planta é instantânea e a ficha fica sempre igual.

import { cacheGet } from "./cache";
import { getPlants, getPlantById, Plant } from "./db";

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
  };
}

/** Busca no catálogo (nome, nome científico e apelidos de busca). */
export async function searchPlants(query: string): Promise<CatalogPlant[]> {
  const term = normalizeForSearch(query);
  if (!term) return [];
  const all = await getPlants();
  return all
    .filter((p) => {
      const name = normalizeForSearch(p.name || "");
      const scientific = normalizeForSearch(p.scientificName || "");
      const aliases = normalizeForSearch(p.aliases || "");
      return (
        name.includes(term) ||
        scientific.includes(term) ||
        aliases.split("|").some((a) => a.trim() === term) ||
        (name.length >= 3 && term.includes(name)) // "rosas" encontra "Rosa"
      );
    })
    .map(plantToListItem);
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
