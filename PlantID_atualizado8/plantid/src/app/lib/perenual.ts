// Integração com a API externa Perenual (catálogo de plantas).
// Documentação: https://perenual.com/docs/api
// A chave fica em uma variável de ambiente (nunca direto no código),
// configurada no Netlify e no .env local como VITE_PERENUAL_API_KEY.

import {
  translateSearchTerm,
  translateKnownName,
  translateToPortuguese,
  translateWatering,
  translateSunlight,
  translateCareLevel,
  translateCycle,
} from "./translate";
import { getPlants, getPlantById, Plant } from "./db";

const PERENUAL_BASE_URL = "https://perenual.com/api/v2";
const API_KEY = import.meta.env.VITE_PERENUAL_API_KEY as string | undefined;
const LOCAL_ID_PREFIX = "local:";

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
  careLevel: string;
  cycle: string;
  fertilization: string;
  indoor: boolean;
  poisonousToPets: boolean;
  poisonousToHumans: boolean;
}

function pickImage(item: any): string {
  const img = item?.default_image;
  return img?.medium_url || img?.regular_url || img?.thumbnail || img?.small_url || "";
}

async function translateName(commonName: string, scientificName: string): Promise<string> {
  const original = (commonName || scientificName || "Planta sem nome").trim();
  const known = translateKnownName(original);
  if (known) return known;
  return translateToPortuguese(original);
}

async function mapListItem(item: any): Promise<PerenualPlant> {
  const scientificName = item.scientific_name?.[0] || "";
  return {
    id: String(item.id),
    name: await translateName(item.common_name, scientificName),
    scientificName,
    image: pickImage(item),
  };
}

async function fetchSpeciesList(term: string): Promise<PerenualPlant[]> {
  const url = `${PERENUAL_BASE_URL}/species-list?key=${API_KEY}&q=${encodeURIComponent(term)}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error("Erro na busca da Perenual:", res.status);
    return [];
  }
  const json = await res.json();
  return Promise.all((json.data ?? []).map(mapListItem));
}

/**
 * Catálogo local (tabela "plants" do Supabase) usado como última tentativa
 * quando a Perenual não acha nada — cobre flores/plantas bem conhecidas que
 * ficam fora da faixa de espécies liberada no plano gratuito da Perenual.
 */
function normalizeForSearch(value: string): string {
  return value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function localPlantToListItem(plant: Plant): PerenualPlant {
  return {
    id: `${LOCAL_ID_PREFIX}${plant.id}`,
    name: plant.name,
    scientificName: plant.scientificName,
    image: plant.images?.[0] || "",
  };
}

function localPlantToDetails(plant: Plant): PerenualPlantDetails {
  return {
    id: `${LOCAL_ID_PREFIX}${plant.id}`,
    name: plant.name,
    scientificName: plant.scientificName,
    image: plant.images?.[0] || "",
    description: plant.description || "Ainda não temos uma descrição detalhada para essa planta.",
    watering: plant.wateringFrequency || "Não informado",
    wateringFrequency: plant.wateringFrequency || "Não informado",
    sunlight: plant.lightRequirement || "Não informado",
    careLevel: plant.careLevel || "Não informado",
    cycle: "",
    fertilization: plant.fertilization || "A cada 30 dias",
    indoor: false,
    poisonousToPets: !!(plant.toxicity?.dangerousToDogs || plant.toxicity?.dangerousToCats),
    poisonousToHumans: (plant.toxicity?.level || "").toLowerCase() === "alta",
  };
}

async function searchLocalCatalog(query: string): Promise<PerenualPlant[]> {
  const term = normalizeForSearch(query.trim());
  if (!term) return [];
  const all = await getPlants();
  return all
    .filter((p) => {
      const name = normalizeForSearch(p.name);
      const scientific = normalizeForSearch(p.scientificName || "");
      return name.includes(term) || scientific.includes(term) || term.includes(name);
    })
    .map(localPlantToListItem);
}

/**
 * Busca plantas por nome. Tenta a Perenual primeiro (com o termo original
 * e, se não achar nada, traduzido para inglês); se mesmo assim não achar,
 * tenta o catálogo local de flores/plantas comuns antes de desistir.
 */
export async function searchPerenualPlants(query: string): Promise<PerenualPlant[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (!API_KEY) {
    console.error("VITE_PERENUAL_API_KEY não configurada — configure a variável de ambiente.");
    return searchLocalCatalog(trimmed);
  }

  try {
    const directResults = await fetchSpeciesList(trimmed);
    if (directResults.length > 0) return directResults;

    const translatedTerm = await translateSearchTerm(trimmed);
    if (translatedTerm.trim().toLowerCase() !== trimmed.toLowerCase()) {
      const translatedResults = await fetchSpeciesList(translatedTerm);
      if (translatedResults.length > 0) return translatedResults;
    }

    return await searchLocalCatalog(trimmed);
  } catch (err) {
    console.error("Erro de rede ao buscar na Perenual:", err);
    return searchLocalCatalog(trimmed);
  }
}

/**
 * Busca os detalhes completos de uma planta, seja ela da Perenual (id
 * numérico) ou do catálogo local (id prefixado com "local:").
 */
export async function getPerenualPlantDetails(
  id: string | number
): Promise<PerenualPlantDetails | null> {
  const idStr = String(id);

  if (idStr.startsWith(LOCAL_ID_PREFIX)) {
    const localId = idStr.slice(LOCAL_ID_PREFIX.length);
    const plant = await getPlantById(localId);
    return plant ? localPlantToDetails(plant) : null;
  }

  if (!API_KEY) {
    console.error("VITE_PERENUAL_API_KEY não configurada — configure a variável de ambiente.");
    return null;
  }

  try {
    const url = `${PERENUAL_BASE_URL}/species/details/${idStr}?key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Erro ao buscar detalhes na Perenual:", res.status);
      return null;
    }
    const item = await res.json();
    const scientificName = item.scientific_name?.[0] || "";
    const rawWatering = item.watering || "";
    const rawSunlight = Array.isArray(item.sunlight) ? item.sunlight.join(", ") : item.sunlight || "";
    const rawCareLevel = item.care_level || "";
    const rawDescription =
      item.description || "Ainda não temos uma descrição detalhada para essa planta.";
    const benchmark = item.watering_general_benchmark;
    const wateringFrequency = benchmark?.value
      ? `A cada ${benchmark.value} dias`
      : rawWatering
        ? translateWatering(rawWatering)
        : "Não informado";

    return {
      id: String(item.id),
      name: await translateName(item.common_name, scientificName),
      scientificName,
      image: pickImage(item),
      description: await translateToPortuguese(rawDescription),
      watering: rawWatering ? translateWatering(rawWatering) : "Não informado",
      wateringFrequency,
      sunlight: rawSunlight ? translateSunlight(rawSunlight) : "Não informado",
      careLevel: rawCareLevel ? translateCareLevel(rawCareLevel) : "Não informado",
      cycle: translateCycle(item.cycle || ""),
      fertilization: "A cada 30 dias",
      indoor: !!item.indoor,
      poisonousToPets: !!item.poisonous_to_pets,
      poisonousToHumans: !!item.poisonous_to_humans,
    };
  } catch (err) {
    console.error("Erro de rede ao buscar detalhes na Perenual:", err);
    return null;
  }
}
