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
function translateAuthError(message?: string): string {
  message = typeof message === "string" ? message : "";
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
  // Se este aparelho ficou com uma sessão antiga (ex.: a senha foi trocada em
  // outro aparelho e a sessão daqui foi encerrada), limpamos só o que é local
  // antes de entrar. Sem isso, o token velho tentava se renovar em segundo
  // plano e podia derrubar o login novo logo depois de entrar.
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  localStorage.removeItem("plantid_user");

  // Celular costuma colocar maiúscula na 1ª letra e espaço no fim do email.
  // (Os espaços da senha são tratados logo abaixo.)
  email = email.trim().toLowerCase();

  // Teclados de celular costumam colocar um ESPAÇO no fim da senha (ao aceitar
  // uma sugestão do corretor). Para essa pessoa conseguir entrar no computador,
  // tentamos primeiro a senha sem espaços nas pontas e, só se falhar, a senha
  // exatamente como foi digitada (contas antigas que realmente tenham espaço).
  const trimmed = password.trim();
  let { data, error } = await supabase.auth.signInWithPassword({ email, password: trimmed });
  if (error && trimmed !== password && (error.message || "").toLowerCase().includes("invalid login credentials")) {
    ({ data, error } = await supabase.auth.signInWithPassword({ email, password }));
  }

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

  email = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: password.trim(), // sem espaços nas pontas (ver comentário no login)
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
  try {
    await supabase.auth.signOut();
  } finally {
    localStorage.removeItem("plantid_user");
  }
}

/**
 * Confere de verdade (no servidor) se a pessoa continua logada. Usado pelo
 * RootLayout: se a senha foi trocada em outro aparelho, o servidor encerra as
 * outras sessões e aqui a gente percebe e manda para o login.
 */
export async function hasValidSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    localStorage.removeItem("plantid_user");
    return false;
  }

  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) {
    // Só consideramos "sessão inválida" quando o servidor respondeu que ela
    // não vale mais. Falha de internet não deve deslogar ninguém.
    const status = (error as any)?.status;
    const offline = !status && /fetch|network/i.test(error?.message ?? "");
    if (offline) return true;
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    localStorage.removeItem("plantid_user");
    return false;
  }

  if (!localStorage.getItem("plantid_user")) {
    localStorage.setItem(
      "plantid_user",
      JSON.stringify({
        id: userData.user.id,
        name: (userData.user.user_metadata?.name as string) ?? userData.user.email?.split("@")[0] ?? "",
        email: userData.user.email ?? "",
      })
    );
  }
  return true;
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
  try {
    sessionStorage.removeItem("plantid_recovery_active");
  } catch {}
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/reset-password`
      : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });

  if (!error) {
    // Avisa a tela de login deste aparelho que a pessoa está trocando a senha
    // (pode ser que ela abra o link no celular e volte aqui para entrar).
    try {
      localStorage.setItem("plantid_reset_pending", String(Date.now()));
    } catch {}
  }

  return { error: error ? translateAuthError(error.message) : null };
}

/**
 * Confirma o CÓDIGO que chega no e-mail de recuperação (alternativa ao link).
 * Serve para quem pediu a troca no computador mas abre o e-mail no celular:
 * em vez de depender do link, digita o código aqui e já cai na tela de nova senha.
 * Obs.: o e-mail só traz o código se o modelo "Reset Password" do Supabase tiver
 * {{ .Token }} (veja modelo_email_recuperar_senha.html).
 */
export async function verifyRecoveryCode(email: string, code: string): Promise<{ error: string | null }> {
  const token = code.replace(/\s+/g, "");
  if (!/^\d{6,10}$/.test(token)) {
    return { error: "Digite o código numérico que chegou no e-mail (geralmente 6 números)." };
  }
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token,
    type: "recovery",
  });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("expired") || m.includes("invalid")) {
      return { error: "Código inválido ou vencido. Confira os números ou peça um novo e-mail." };
    }
    return { error: translateAuthError(error.message) };
  }
  return { error: null };
}

/**
 * Define uma nova senha para o usuário que chegou pelo link de recuperação.
 * Só funciona se já existir uma sessão de recuperação ativa (criada
 * automaticamente pelo Supabase ao abrir o link do email em /reset-password).
 */
export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  const clean = newPassword.trim(); // sem espaços nas pontas (ver comentário no login)
  if (clean.length < 6) return { error: "A senha precisa ter pelo menos 6 caracteres." };
  const { error } = await supabase.auth.updateUser({ password: clean });
  return { error: error ? translateAuthError(error.message) : null };
}

/** Depois de trocar a senha: encerra a sessão de recuperação em TODOS os aparelhos. */
export async function finishPasswordReset() {
  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch {}
  // Em qualquer cenário, encerra também a sessão deste aparelho; a pessoa
  // deve voltar ao login e entrar manualmente com a senha recém-definida.
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  localStorage.removeItem("plantid_user");
  try {
    localStorage.removeItem("plantid_reset_pending");
  } catch {}
  try {
    sessionStorage.removeItem("plantid_recovery_active");
  } catch {}
}
