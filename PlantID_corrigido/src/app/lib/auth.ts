import { supabase } from "./supabase";

export interface User {
  id: string;
  name: string;
  email: string;
}

// Faz login de verdade com o Supabase e devolve os dados do usuário
export async function login(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { user: null, error: error?.message ?? "Não foi possível entrar." };
  }

  const user: User = {
    id: data.user.id,
    name: (data.user.user_metadata?.name as string) ?? email.split("@")[0],
    email: data.user.email ?? email,
  };

  localStorage.setItem("plantid_user", JSON.stringify(user));
  return { user, error: null };
}

// Cria uma conta de verdade no Supabase
export async function signup(name: string, email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) {
    return { user: null, error: error.message };
  }

  if (!data.user) {
    return { user: null, error: null };
  }

  const user: User = {
    id: data.user.id,
    name,
    email,
  };

  // Se a confirmação de email estiver ativada no Supabase, ainda não existe sessão aqui.
  if (data.session) {
    localStorage.setItem("plantid_user", JSON.stringify(user));
  }

  return { user, error: null };
}

export async function logout() {
  await supabase.auth.signOut();
  localStorage.removeItem("plantid_user");
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  return {
    id: data.user.id,
    name: (data.user.user_metadata?.name as string) ?? data.user.email?.split("@")[0] ?? "",
    email: data.user.email ?? "",
  };
}
