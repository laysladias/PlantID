import { supabase } from "./supabase";

export interface User {
  id: string;
  name: string;
  email: string;
}

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

/** Envia email de recuperação de senha via Supabase Auth */
export async function resetPassword(email: string): Promise<{ error: string | null }> {
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/login`
      : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  return { error: error?.message ?? null };
}
