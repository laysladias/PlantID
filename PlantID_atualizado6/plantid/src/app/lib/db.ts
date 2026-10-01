import { supabase } from "./supabase";

export interface Plant {
  id: string;
  name: string;
  scientificName: string;
  description: string;
  wateringFrequency: string;
  lightRequirement: string;
  lightIntensityMin: number;
  lightIntensityMax: number;
  idealTemperature: string;
  humidity: string;
  toxicity: {
    level: string;
    dangerousToDogs: boolean;
    dangerousToCats: boolean;
    dangerousToOther: boolean;
    symptoms?: string;
  };
  careLevel: string;
  soilType: string;
  fertilization: string;
  images: string[];
}

export interface MyPlant {
  id: string;
  plantId: string;
  name: string;
  scientificName: string;
  nickname: string;
  image: string;
  lastWatered: Date | null;
  nextWatering: Date | null;
  location: string;
}

export interface Reminder {
  id: string;
  userPlantId: string | null;
  plantName: string;
  type: "watering" | "fertilization";
  frequency: string;
  nextDate: Date;
  enabled: boolean;
}

function rowToPlant(row: any): Plant {
  return {
    id: row.id,
    name: row.name,
    scientificName: row.scientific_name,
    description: row.description,
    wateringFrequency: row.watering_frequency,
    lightRequirement: row.light_requirement,
    lightIntensityMin: row.light_intensity_min,
    lightIntensityMax: row.light_intensity_max,
    idealTemperature: row.ideal_temperature,
    humidity: row.humidity,
    toxicity: {
      level: row.toxicity_level,
      dangerousToDogs: row.dangerous_to_dogs,
      dangerousToCats: row.dangerous_to_cats,
      dangerousToOther: row.dangerous_to_other,
      symptoms: row.toxicity_symptoms ?? undefined,
    },
    careLevel: row.care_level,
    soilType: row.soil_type,
    fertilization: row.fertilization,
    images: row.images ?? [],
  };
}

export async function getPlants(): Promise<Plant[]> {
  const { data, error } = await supabase.from("plants").select("*");
  if (error) {
    console.error("Erro ao buscar plantas:", error.message);
    return [];
  }
  return (data ?? []).map(rowToPlant);
}

export async function getPlantById(id: string): Promise<Plant | null> {
  const { data, error } = await supabase
    .from("plants")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) {
    console.error("Erro ao buscar planta:", error?.message);
    return null;
  }
  return rowToPlant(data);
}

export async function getMyPlants(): Promise<MyPlant[]> {
  const { data, error } = await supabase
    .from("user_plants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar minhas plantas:", error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    plantId: row.plant_id,
    name: row.plant_name ?? row.nickname ?? "Planta",
    scientificName: row.scientific_name ?? "",
    nickname: row.nickname ?? "",
    image: row.plant_image ?? "",
    lastWatered: row.last_watered ? new Date(row.last_watered) : null,
    nextWatering: row.next_watering ? new Date(row.next_watering) : null,
    location: row.location ?? "",
  }));
}

export async function addMyPlant(params: {
  plantId: string;
  name: string;
  scientificName?: string;
  image: string;
  nickname: string;
  location: string;
}): Promise<{ error: string | null; alreadyExists?: boolean }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { error: "Usuário não está logado." };

  const { data: existing } = await supabase
    .from("user_plants")
    .select("id")
    .eq("user_id", userId)
    .eq("plant_id", params.plantId)
    .maybeSingle();

  if (existing) {
    return { error: null, alreadyExists: true };
  }

  const now = new Date();
  const nextWatering = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { error } = await supabase.from("user_plants").insert({
    user_id: userId,
    plant_id: params.plantId,
    plant_name: params.name,
    scientific_name: params.scientificName ?? null,
    plant_image: params.image,
    nickname: params.nickname,
    location: params.location,
    last_watered: now.toISOString(),
    next_watering: nextWatering.toISOString(),
  });

  return { error: error?.message ?? null };
}

export async function waterMyPlant(userPlantId: string): Promise<{ error: string | null }> {
  const now = new Date();
  const nextWatering = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { error } = await supabase
    .from("user_plants")
    .update({
      last_watered: now.toISOString(),
      next_watering: nextWatering.toISOString(),
    })
    .eq("id", userPlantId);

  return { error: error?.message ?? null };
}

export async function deleteMyPlant(userPlantId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("user_plants").delete().eq("id", userPlantId);
  return { error: error?.message ?? null };
}

export async function getReminders(): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .order("next_date", { ascending: true });

  if (error) {
    console.error("Erro ao buscar lembretes:", error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    userPlantId: row.user_plant_id,
    plantName: row.plant_name,
    type: row.type,
    frequency: row.frequency,
    nextDate: new Date(row.next_date),
    enabled: row.enabled,
  }));
}

export async function addReminder(params: {
  userPlantId: string | null;
  plantName: string;
  type: "watering" | "fertilization";
  frequency: string;
  nextDate: Date;
}): Promise<{ error: string | null }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { error: "Usuário não está logado." };

  const { error } = await supabase.from("reminders").insert({
    user_id: userId,
    user_plant_id: params.userPlantId,
    plant_name: params.plantName,
    type: params.type,
    frequency: params.frequency,
    next_date: params.nextDate.toISOString(),
    enabled: true,
  });

  return { error: error?.message ?? null };
}

export async function toggleReminder(id: string, enabled: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.from("reminders").update({ enabled }).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteReminder(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("reminders").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function markReminderDone(
  id: string,
  frequencyDays = 7
): Promise<{ error: string | null }> {
  const next = new Date(Date.now() + frequencyDays * 24 * 60 * 60 * 1000);
  const { error } = await supabase
    .from("reminders")
    .update({ next_date: next.toISOString() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

/**
 * Envia uma mensagem do formulário de Contato/Suporte para a tabela
 * contact_messages no Supabase.
 */
export async function sendContactMessage(params: {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from("contact_messages").insert({
    first_name: params.firstName,
    last_name: params.lastName,
    email: params.email,
    message: params.message,
  });

  return { error: error?.message ?? null };
}

/**
 * Registra (ou incrementa o contador de) uma busca que não encontrou
 * nenhuma planta, na tabela plant_requests. Usada pra saber quais plantas
 * os usuários mais procuram e ainda não temos.
 */
export async function logMissingSearch(term: string): Promise<void> {
  const cleaned = term.trim();
  if (!cleaned) return;

  try {
    const { data: existing } = await supabase
      .from("plant_requests")
      .select("id, request_count")
      .ilike("search_term", cleaned)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("plant_requests")
        .update({ request_count: (existing.request_count ?? 1) + 1 })
        .eq("id", existing.id);
    } else {
      await supabase.from("plant_requests").insert({ search_term: cleaned });
    }
  } catch (err) {
    // Falha ao registrar não deve travar a busca do usuário — só loga.
    console.error("Erro ao registrar busca sem resultado:", err);
  }
}
