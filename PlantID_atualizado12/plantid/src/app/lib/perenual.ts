// Busca de plantas: junta DUAS fontes ao mesmo tempo.
//  1) Catálogo local (tabela "plants" do Supabase) — plantas conhecidas, já
//     em português, com imagem e cuidados.
//  2) API Perenual (milhares de espécies, em inglês — traduzidas aqui).
// Se uma das fontes falhar ou estiver sem limite, a outra continua funcionando.
//
// Documentação da Perenual: https://perenual.com/docs/api
// A chave fica na variável de ambiente VITE_PERENUAL_API_KEY.

import {
  translateSearchTerm,
  translateKnownName,
  translatePlantName,
  translateToPortuguese,
  translateWatering,
  translateSunlight,
  translateCareLevel,
  translateCycle,
  defaultWateringFrequency,
} from "./translate";
import { cacheGet, cacheSet } from "./cache";
import { getPlants, getPlantById, Plant } from "./db";

const PERENUAL_BASE_URL = "https://perenual.com/api/v2";
const API_KEY = import.meta.env.VITE_PERENUAL_API_KEY as string | undefined;
const LOCAL_ID_PREFIX = "local:";
const MAX_API_RESULTS = 20;
// O plano gratuito da Perenual só libera as espécies de id 1 a 3000.
const FREE_PLAN_MAX_ID = 3000;

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

// ---------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------

function normalizeForSearch(value: string): string {
  return value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function pickImage(item: any): string {
  const img = item?.default_image;
  const url: string = img?.medium_url || img?.regular_url || img?.thumbnail || img?.small_url || "";
  // No plano gratuito a Perenual devolve uma imagem "faça upgrade" no lugar.
  return /upgrade_access/i.test(url) ? "" : url;
}

/** Entradas bloqueadas do plano gratuito vêm com um texto de "faça upgrade". */
function isLockedItem(item: any): boolean {
  const id = Number(item?.id);
  const text = `${item?.common_name ?? ""} ${item?.description ?? ""}`;
  return (
    !item ||
    !Number.isFinite(id) ||
    id > FREE_PLAN_MAX_ID ||
    /upgrade plans|subscription-api-pricing|i'm sorry/i.test(text)
  );
}

async function mapListItem(item: any): Promise<PerenualPlant> {
  const scientificName: string = item.scientific_name?.[0] || "";
  const commonName: string = item.common_name || "";
  const name = commonName ? await translatePlantName(commonName) : scientificName || "Planta sem nome";
  return {
    id: String(item.id),
    name,
    scientificName,
    image: pickImage(item),
  };
}

// ---------------------------------------------------------------
// Fonte 1: catálogo local (Supabase)
// ---------------------------------------------------------------

function localPlantToListItem(plant: Plant): PerenualPlant {
  return {
    id: `${LOCAL_ID_PREFIX}${plant.id}`,
    name: plant.name,
    scientificName: plant.scientificName || "",
    image: plant.images?.[0] || "",
  };
}

function localPlantToDetails(plant: Plant): PerenualPlantDetails {
  return {
    id: `${LOCAL_ID_PREFIX}${plant.id}`,
    name: plant.name,
    scientificName: plant.scientificName || "",
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
  try {
    const term = normalizeForSearch(query.trim());
    if (!term) return [];
    const all = await getPlants();
    return all
      .filter((p) => {
        const name = normalizeForSearch(p.name || "");
        const scientific = normalizeForSearch(p.scientificName || "");
        return (
          name.includes(term) ||
          scientific.includes(term) ||
          (name.length >= 3 && term.includes(name)) // "rosas" encontra "Rosa"
        );
      })
      .map(localPlantToListItem);
  } catch (err) {
    console.error("Erro ao buscar no catálogo local:", err);
    return [];
  }
}

// ---------------------------------------------------------------
// Fonte 2: Perenual
// ---------------------------------------------------------------

async function fetchSpeciesList(term: string): Promise<PerenualPlant[]> {
  const cacheKey = `list:${term.toLowerCase()}`;
  const cached = cacheGet<PerenualPlant[]>(cacheKey);
  if (cached) return cached;

  const url = `${PERENUAL_BASE_URL}/species-list?key=${API_KEY}&q=${encodeURIComponent(term)}`;
  const res = await fetch(url);
  if (!res.ok) {
    // 429 = limite diário da conta gratuita; 401/403 = chave inválida.
    console.error("Erro na busca da Perenual:", res.status);
    return [];
  }
  const json = await res.json();
  const items = (json.data ?? []).filter((item: any) => !isLockedItem(item)).slice(0, MAX_API_RESULTS);
  const mapped = await Promise.all(items.map(mapListItem));
  cacheSet(cacheKey, mapped, 24 * 60 * 60 * 1000);
  return mapped;
}

async function safeFetchSpeciesList(term: string): Promise<PerenualPlant[]> {
  try {
    return await fetchSpeciesList(term);
  } catch (err) {
    console.error(`Erro ao consultar a Perenual para "${term}":`, err);
    return [];
  }
}

// ---------------------------------------------------------------
// Busca combinada
// ---------------------------------------------------------------

function plantSearchKey(plant: PerenualPlant): string {
  const clean = (value: string) => normalizeForSearch(value).replace(/[^a-z0-9]+/g, " ").trim();
  return `${clean(plant.name)}|${clean(plant.scientificName)}`;
}

function mergeSearchResults(...groups: PerenualPlant[][]): PerenualPlant[] {
  const merged = new Map<string, PerenualPlant>();
  for (const group of groups) {
    for (const plant of group) {
      const key = plantSearchKey(plant);
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, plant);
      } else if (!existing.image && plant.image) {
        merged.set(key, { ...plant, id: existing.id, name: existing.name });
      }
    }
  }
  return Array.from(merged.values());
}

/**
 * Busca nas duas fontes ao mesmo tempo (banco local + API). Resultados do
 * banco local aparecem primeiro (já em português e com cuidados completos).
 */
export async function searchPerenualPlants(query: string): Promise<PerenualPlant[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const localPromise = searchLocalCatalog(trimmed);

  if (!API_KEY) {
    console.error("VITE_PERENUAL_API_KEY não configurada — usando só o catálogo local.");
    return localPromise;
  }

  const apiPromise = (async () => {
    const terms = [trimmed];
    const translated = await translateSearchTerm(trimmed);
    if (translated.trim().toLowerCase() !== trimmed.toLowerCase()) terms.push(translated);
    const results = await Promise.all(terms.map(safeFetchSpeciesList));
    return mergeSearchResults(...results);
  })().catch((err) => {
    console.error("Erro na busca da Perenual:", err);
    return [] as PerenualPlant[];
  });

  const [localResults, apiResults] = await Promise.all([localPromise, apiPromise]);
  return mergeSearchResults(localResults, apiResults);
}

// ---------------------------------------------------------------
// Detalhes
// ---------------------------------------------------------------

/**
 * Detalhes completos de uma planta: do catálogo local (id "local:...")
 * ou da Perenual (id numérico).
 */
export async function getPerenualPlantDetails(
  id: string | number
): Promise<PerenualPlantDetails | null> {
  const idStr = String(id);

  if (idStr.startsWith(LOCAL_ID_PREFIX)) {
    const plant = await getPlantById(idStr.slice(LOCAL_ID_PREFIX.length));
    return plant ? localPlantToDetails(plant) : null;
  }

  const cacheKey = `details:${idStr}`;
  const cached = cacheGet<PerenualPlantDetails>(cacheKey);
  if (cached) return cached;

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
    if (isLockedItem(item)) return null;

    const scientificName: string = item.scientific_name?.[0] || "";
    const rawWatering: string = item.watering || "";
    const rawSunlight: string = Array.isArray(item.sunlight)
      ? item.sunlight.join(", ")
      : item.sunlight || "";
    const rawCareLevel: string = item.care_level || "";
    const rawDescription: string =
      item.description || "Ainda não temos uma descrição detalhada para essa planta.";
    const benchmarkValue = item.watering_general_benchmark?.value;

    const wateringFrequency = benchmarkValue
      ? `A cada ${String(benchmarkValue).replace(/"/g, "")} dias`
      : defaultWateringFrequency(rawWatering) || "A cada 7 dias";

    const [name, description] = await Promise.all([
      item.common_name ? translatePlantName(item.common_name) : Promise.resolve(scientificName || "Planta sem nome"),
      translateToPortuguese(rawDescription),
    ]);

    const details: PerenualPlantDetails = {
      id: String(item.id),
      name,
      scientificName,
      image: pickImage(item),
      description,
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
    cacheSet(cacheKey, details, 7 * 24 * 60 * 60 * 1000);
    return details;
  } catch (err) {
    console.error("Erro de rede ao buscar detalhes na Perenual:", err);
    return null;
  }
}

// Mantido para quem ainda importa esse nome em outros arquivos.
export { translateKnownName };
