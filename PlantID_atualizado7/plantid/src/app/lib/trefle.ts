const TREFLE_BASE_URL = "https://trefle.io/api/v1";
const TREFLE_API_KEY = import.meta.env.VITE_TREFLE_API_KEY as string | undefined;

export interface TreflePlant {
  id: string;
  name: string;
  scientificName: string;
  image: string;
}

function translatedName(name: string, scientificName: string): string {
  const known: Record<string, string> = {
    rose: "Rosa",
    "peace lily": "Lírio-da-paz",
    lily: "Lírio",
    daisy: "Margarida",
    tulip: "Tulipa",
    sunflower: "Girassol",
    violet: "Violeta",
    jasmine: "Jasmim",
    hibiscus: "Hibisco",
    lavender: "Lavanda",
    orchid: "Orquídea",
  };
  return known[name.trim().toLowerCase()] ?? (name || scientificName || "Planta");
}

function mapItem(item: any): TreflePlant {
  const scientificName = item.scientific_name || "";
  return {
    id: `trefle:${item.id}`,
    name: translatedName(item.common_name || "", scientificName),
    scientificName,
    image: item.image_url || "",
  };
}

export function isTrefleId(id: string): boolean {
  return id.startsWith("trefle:");
}

export function trefleNumericId(id: string): string {
  return id.replace(/^trefle:/, "");
}

export async function searchTreflePlants(query: string): Promise<TreflePlant[]> {
  if (!TREFLE_API_KEY || !query.trim()) return [];
  try {
    const url = `${TREFLE_BASE_URL}/plants/search?token=${encodeURIComponent(TREFLE_API_KEY)}&q=${encodeURIComponent(query.trim())}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const json = await response.json();
    return (json.data ?? []).filter((item: any) => item.rank === "species" || !item.rank).map(mapItem);
  } catch (error) {
    console.error("Erro na busca da Trefle:", error);
    return [];
  }
}

export async function getTreflePlantDetails(id: string): Promise<any | null> {
  if (!TREFLE_API_KEY) return null;
  try {
    const numericId = trefleNumericId(id);
    const response = await fetch(
      `${TREFLE_BASE_URL}/plants/${encodeURIComponent(numericId)}?token=${encodeURIComponent(TREFLE_API_KEY)}`
    );
    if (!response.ok) return null;
    const json = await response.json();
    const item = json.data ?? json;
    const scientificName = item.scientific_name || "";
    return {
      id,
      name: translatedName(item.common_name || "", scientificName),
      scientificName,
      image: item.image_url || "",
      description: item.observations || item.description || "Informações botânicas encontradas na Trefle.",
      watering: "Consulte a necessidade de rega específica desta espécie.",
      wateringFrequency: "A cada 7 dias",
      sunlight: item.growth?.light ?? "Não informado",
      lightRequirement: "Não informado",
      lightIntensityMin: null,
      lightIntensityMax: null,
      fertilization: "A cada 30 dias",
      careLevel: item.growth?.soil_nutriments ? "Moderado" : "Não informado",
      cycle: item.duration || "Não informado",
      indoor: false,
      poisonousToPets: false,
      poisonousToHumans: false,
    };
  } catch (error) {
    console.error("Erro ao buscar detalhes na Trefle:", error);
    return null;
  }
}
