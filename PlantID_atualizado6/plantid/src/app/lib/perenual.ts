// Integração com a API externa Perenual (catálogo de plantas).
// Documentação: https://perenual.com/docs/api
// A chave fica em uma variável de ambiente (nunca direto no código),
// configurada no Netlify e no .env local como VITE_PERENUAL_API_KEY.

import {
  translateToEnglish,
  translateToPortuguese,
  translateWatering,
  translateSunlight,
  translateCareLevel,
} from "./translate";

const PERENUAL_BASE_URL = "https://perenual.com/api/v2";
const API_KEY = import.meta.env.VITE_PERENUAL_API_KEY as string | undefined;

export interface PerenualPlant {
  id: string;
  name: string;
  scientificName: string;
  image: string;
}

export interface PerenualPlantDetails extends PerenualPlant {
  description: string;
  watering: string;
  sunlight: string;
  careLevel: string;
  cycle: string;
  indoor: boolean;
  poisonousToPets: boolean;
  poisonousToHumans: boolean;
}

function pickImage(item: any): string {
  const img = item?.default_image;
  return img?.medium_url || img?.regular_url || img?.thumbnail || img?.small_url || "";
}

function mapListItem(item: any): PerenualPlant {
  return {
    id: String(item.id),
    name: item.common_name || item.scientific_name?.[0] || "Planta sem nome",
    scientificName: item.scientific_name?.[0] || "",
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
  return (json.data ?? []).map(mapListItem);
}

/**
 * Busca plantas por nome na Perenual. Retorna lista vazia se não houver
 * chave configurada, se a busca estiver vazia, ou se a API falhar —
 * o chamador decide o que mostrar nesses casos (nunca lança erro).
 *
 * A Perenual só entende nomes em inglês, então se a busca com o termo
 * original não achar nada, tentamos de novo traduzindo pt → en.
 */
export async function searchPerenualPlants(query: string): Promise<PerenualPlant[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  if (!API_KEY) {
    console.error(
      "VITE_PERENUAL_API_KEY não configurada — configure a variável de ambiente."
    );
    return [];
  }

  try {
    const directResults = await fetchSpeciesList(trimmed);
    if (directResults.length > 0) return directResults;

    const translatedTerm = await translateToEnglish(trimmed);
    if (translatedTerm.trim().toLowerCase() === trimmed.toLowerCase()) {
      return directResults;
    }
    return await fetchSpeciesList(translatedTerm);
  } catch (err) {
    console.error("Erro de rede ao buscar na Perenual:", err);
    return [];
  }
}

/**
 * Busca os detalhes completos de uma planta pelo id da Perenual.
 */
export async function getPerenualPlantDetails(
  id: string | number
): Promise<PerenualPlantDetails | null> {
  if (!API_KEY) {
    console.error(
      "VITE_PERENUAL_API_KEY não configurada — configure a variável de ambiente."
    );
    return null;
  }

  try {
    const url = `${PERENUAL_BASE_URL}/species/details/${id}?key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Erro ao buscar detalhes na Perenual:", res.status);
      return null;
    }
    const item = await res.json();
    const rawWatering = item.watering || "";
    const rawSunlight = Array.isArray(item.sunlight)
      ? item.sunlight.join(", ")
      : item.sunlight || "";
    const rawCareLevel = item.care_level || "";
    const rawDescription =
      item.description || "Ainda não temos uma descrição detalhada para essa planta.";

    return {
      id: String(item.id),
      name: item.common_name || item.scientific_name?.[0] || "Planta sem nome",
      scientificName: item.scientific_name?.[0] || "",
      image: pickImage(item),
      description: await translateToPortuguese(rawDescription),
      watering: rawWatering ? translateWatering(rawWatering) : "Não informado",
      sunlight: rawSunlight ? translateSunlight(rawSunlight) : "Não informado",
      careLevel: rawCareLevel ? translateCareLevel(rawCareLevel) : "Não informado",
      cycle: item.cycle || "",
      indoor: !!item.indoor,
      poisonousToPets: !!item.poisonous_to_pets,
      poisonousToHumans: !!item.poisonous_to_humans,
    };
  } catch (err) {
    console.error("Erro de rede ao buscar detalhes na Perenual:", err);
    return null;
  }
}
