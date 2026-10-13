// Conversa com a IA de jardinagem (função do servidor /api/plant-chat).

import { supabase } from "./supabase";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function errorMessage(code: string | undefined, status: number): string {
  if (status === 401 || code === "unauthorized") return "Entre na sua conta para conversar com a IA.";
  if (status === 429 || code === "rate_limited")
    return "A IA atingiu o limite de pedidos por agora. Tente de novo em alguns instantes.";
  if (code === "missing_groq_key") return "A IA ainda não foi configurada no servidor (falta a chave GROQ_API_KEY).";
  if (status === 404) return "A função do chat não foi encontrada. Confira se o deploy na Vercel incluiu a pasta api.";
  return "Não consegui responder agora. Tente novamente em instantes.";
}

export async function askPlantChat(
  messages: ChatMessage[],
  plantNames: string[]
): Promise<{ reply: string } | { error: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  let res: Response;
  try {
    res = await fetch("/api/plant-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ messages: messages.slice(-12), plants: plantNames }),
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
  if (!json?.reply) return { error: errorMessage(undefined, 500) };
  return { reply: String(json.reply) };
}
