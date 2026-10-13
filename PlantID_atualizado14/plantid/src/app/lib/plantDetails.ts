// "Sobre" completo da planta: resumo automático dos cuidados (feito aqui, sem IA)
// e detalhes extras (origem, curiosidade, dicas...) escritos pela IA e salvos no banco.

import { supabase } from "./supabase";
import type { PlantDetails } from "./plantCatalog";

export interface ExtraDetails {
  origin?: string;
  curiosity?: string;
  tips?: string[];
  problems?: string[];
  propagation?: string;
}

/** Converte o JSON vindo do banco/servidor em um objeto seguro (ou null se vazio). */
export function parseExtra(raw: unknown): ExtraDetails | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
  const list = (v: unknown, n: number, max: number) =>
    Array.isArray(v)
      ? v.map((x) => text(x, max)).filter((x): x is string => !!x).slice(0, n)
      : [];
  const extra: ExtraDetails = {
    origin: text(r.origin, 400),
    curiosity: text(r.curiosity, 400),
    tips: list(r.tips, 5, 220),
    problems: list(r.problems, 4, 260),
    propagation: text(r.propagation, 400),
  };
  const hasAny =
    extra.origin || extra.curiosity || extra.propagation || (extra.tips?.length ?? 0) > 0 || (extra.problems?.length ?? 0) > 0;
  return hasAny ? extra : null;
}

function errorMessage(code: string | undefined, status: number): string {
  if (status === 401 || code === "unauthorized") return "Entre na sua conta para usar a IA.";
  if (status === 429 || code === "rate_limited")
    return "A IA atingiu o limite de pedidos por agora. Tente de novo em alguns instantes.";
  if (code === "missing_groq_key") return "A IA ainda não foi configurada no servidor (falta a chave GROQ_API_KEY).";
  if (status === 404) return "A função de IA não foi encontrada. Confira se o deploy na Vercel incluiu a pasta api.";
  return "Não foi possível buscar mais detalhes agora. Tente novamente em instantes.";
}

/** Pede à IA (função /api/plant-details) os detalhes extras de uma planta. */
export async function generateExtraDetails(
  name: string,
  scientificName: string
): Promise<{ extra: ExtraDetails } | { error: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  let res: Response;
  try {
    res = await fetch("/api/plant-details", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ name, scientificName }),
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
  const extra = parseExtra(json?.extra);
  if (!extra) return { error: "A IA não conseguiu detalhes confiáveis para essa planta." };
  return { extra };
}

/**
 * Salva os detalhes no banco para todos verem. A regra de segurança só deixa
 * preencher UMA vez (se já houver detalhes, nada é sobrescrito).
 */
export async function saveExtraDetails(plantDbId: string, extra: ExtraDetails): Promise<boolean> {
  const { data, error } = await supabase
    .from("plants")
    .update({ extra_details: extra })
    .eq("id", plantDbId)
    .is("extra_details", null)
    .select("id");
  if (error) {
    console.error("Não foi possível salvar os detalhes extras:", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Resumo automático dos cuidados (usa só os dados que já temos na ficha)
// ---------------------------------------------------------------------------

function lowerFirst(text: string): string {
  return text ? text.charAt(0).toLocaleLowerCase("pt-BR") + text.slice(1) : text;
}

const LIGHT_TEXT: Record<string, string> = {
  "sol pleno": "Gosta de sol pleno: precisa de várias horas de sol direto por dia.",
  "meia-sombra": "Prefere meia-sombra: luz clara, com sol direto apenas por pouco tempo.",
  "luz indireta": "Fica bem em local claro, perto de uma janela, mas sem sol direto forte.",
  sombra: "Tolera ambientes com pouca luz e deve ficar longe do sol forte.",
};

export function buildCareSummary(plant: PlantDetails): string[] {
  const out: string[] = [];
  const empty = (v?: string) => !v || v === "Não informado";

  if (!empty(plant.careLevel)) {
    out.push(`${plant.name} é considerada uma planta de cuidado ${lowerFirst(plant.careLevel)}.`);
  }
  if (!empty(plant.wateringFrequency)) {
    const w = plant.wateringFrequency.trim().replace(/\.$/, "");
    out.push(/^a cada/i.test(w) ? `Regue ${lowerFirst(w)}.` : `Rega: ${w}.`);
  }
  if (!empty(plant.sunlight)) {
    out.push(LIGHT_TEXT[plant.sunlight.toLowerCase()] ?? `Luz: ${plant.sunlight}.`);
  }
  if (plant.idealTemperature) out.push(`Temperatura ideal: ${plant.idealTemperature}.`);
  if (plant.humidity) out.push(`Umidade do ar: ${lowerFirst(plant.humidity)}.`);
  if (plant.soilType) out.push(`Solo ou substrato: ${lowerFirst(plant.soilType.replace(/\.$/, ""))}.`);
  if (plant.fertilization) out.push(`Adubação: ${lowerFirst(plant.fertilization.replace(/\.$/, ""))}.`);

  const level = plant.toxicityLevel.toLowerCase();
  if (level === "desconhecida") {
    out.push("Toxicidade não confirmada: por precaução, mantenha longe de crianças e animais.");
  } else if (plant.poisonousToPets && plant.poisonousToHumans) {
    out.push("Atenção: pode fazer mal a cães, gatos e pessoas se for comida. Mantenha fora do alcance.");
  } else if (plant.poisonousToPets) {
    out.push("Atenção: pode fazer mal a cães e gatos se for comida. Mantenha fora do alcance dos pets.");
  } else if (plant.poisonousToHumans) {
    out.push("Atenção: pode causar problemas em pessoas se for comida. Mantenha longe de crianças.");
  } else {
    out.push("Segundo os dados do app, não é considerada tóxica para pets e pessoas.");
  }
  return out;
}
