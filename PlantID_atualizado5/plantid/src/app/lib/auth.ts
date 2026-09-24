import { supabase } from "./supabase";

export interface User {
  id: string;
  name: string;
  email: string;
}

/**
 * O Supabase sempre devolve as mensagens de erro em inglês. Como o app é
 * todo em português, traduzimos as mensagens mais comuns aqui, num lugar
 * só, pra toda tela (login, cadastro, recuperação de senha) mostrar o erro
 * certo pro usuário.
 */
function translateAuthError(message: string): string {
  const secondsMatch = message.match(/after (\d+) seconds?/i);
  if (secondsMatch) {
    return `Por segurança, aguarde ${secondsMatch[1]} segundos antes de tentar de novo.`;
  }

  const m = message.toLowerCase();

  if (m.includes("invalid login credentials")) {
    return "Email ou senha incorretos.";
  }
  if (m.includes("email not confirmed")) {
    return "Este email ainda não foi confirmado. Verifique sua caixa de entrada (e o spam) e clique no link de confirmação antes de entrar.";
  }
  if (m.includes("already registered") || m.includes("user already exists")) {
    return "Já existe uma conta cadastrada com este email.";
  }
  if (m.includes("email rate limit exceeded")) {
    return "Limite de envio de emails atingido por agora. Aguarde um pouco e tente novamente (confira também se o email anterior não caiu no spam).";
  }
  if (m.includes("over_email_send_rate_limit") || m.includes("over_request_rate_limit")) {
    return "Muitas tentativas em pouco tempo. Aguarde um instante antes de tentar novamente.";
  }
  if (m.includes("password should be at least") || m.includes("password is too short")) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  if (m.includes("unable to validate email address") || m.includes("invalid email")) {
    return "Formato de email inválido.";
  }
  if (m.includes("token has expired") || (m.includes("token") && m.includes("invalid"))) {
    return "O link ou código expirou ou é inválido. Solicite um novo.";
  }
  if (m.includes("user not found")) {
    return "Não encontramos uma conta com este email.";
  }
  if (m.includes("same password") || m.includes("different from the old")) {
    return "A nova senha precisa ser diferente da senha atual.";
  }
  if (m.includes("weak password")) {
    return "Senha muito fraca. Tente uma senha mais forte.";
  }
  if (m.includes("failed to fetch") || m.includes("network")) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }
  if (m.includes("signups not allowed") || m.includes("signup is disabled")) {
    return "Novos cadastros estão temporariamente desativados.";
  }

  return "Ocorreu um erro inesperado. Tente novamente em instantes.";
}

export async function login(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { user: null, error: error ? translateAuthError(error.message) : "Não foi possível entrar." };
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
  const emailRedirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo },
  });

  if (error) {
    return { user: null, error: translateAuthError(error.message) };
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
      ? `${window.location.origin}/reset-password`
      : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  return { error: error ? translateAuthError(error.message) : null };
}

/**
 * Define uma nova senha para o usuário que chegou pelo link de recuperação.
 * Só funciona se já existir uma sessão de recuperação ativa (criada
 * automaticamente pelo Supabase ao abrir o link do email em /reset-password).
 */
export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error: error ? translateAuthError(error.message) : null };
}
