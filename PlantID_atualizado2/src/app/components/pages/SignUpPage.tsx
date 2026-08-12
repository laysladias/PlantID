import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { Leaf, Mail, Lock, User as UserIcon, Eye, EyeOff, ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { signup, resendSignupConfirmation } from "../../lib/auth";

// Tempo de espera entre um reenvio e outro do email de confirmação.
const RESEND_COOLDOWN_SECONDS = 60;

export function SignUpPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Depois que a conta é criada (e precisa de confirmação por email), a
  // tela troca pra esse modo, em vez de voltar direto pro login.
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem!");
      return;
    }

    setLoading(true);
    const { user, error } = await signup(name, email, password);
    setLoading(false);

    if (error) {
      toast.error(error);
      return;
    }

    if (!user) {
      toast.error("Não foi possível criar a conta.");
      return;
    }

    if (localStorage.getItem("plantid_user")) {
      // Confirmação de email está desativada no projeto: o usuário já
      // entra direto, sem precisar confirmar nada.
      toast.success("Conta criada com sucesso!");
      navigate("/");
      return;
    }

    // Caso normal: precisa confirmar o email antes de conseguir entrar.
    setAwaitingConfirmation(true);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    const { error } = await resendSignupConfirmation(email);
    setResending(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success("Email de confirmação reenviado! Confira sua caixa de entrada.");
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  };

  if (awaitingConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <button
            type="button"
            onClick={() => setAwaitingConfirmation(false)}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div className="flex flex-col items-center text-center mb-6">
            <div className="bg-green-100 p-4 rounded-full mb-4">
              <MailCheck className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Confirme seu email</h1>
            <p className="text-gray-600 mt-3">
              Enviamos um link de confirmação para{" "}
              <span className="font-semibold text-gray-800">{email}</span>.
              Abra o email e clique no link para ativar sua conta.
            </p>
            <p className="text-gray-500 text-sm mt-3">
              Não esqueça de checar a caixa de spam/lixo eletrônico — às
              vezes o email de confirmação cai lá.
            </p>
          </div>

          <Button
            onClick={handleResend}
            disabled={resendCooldown > 0 || resending}
            variant="outline"
            className="w-full"
          >
            {resending
              ? "Reenviando..."
              : resendCooldown > 0
                ? `Reenviar email (${resendCooldown}s)`
                : "Reenviar email de confirmação"}
          </Button>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Já confirmou?{" "}
              <Link
                to="/login"
                className="text-green-600 hover:text-green-700 font-semibold"
              >
                Ir para o login
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-green-100 p-4 rounded-full mb-4">
            <Leaf className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Criar Conta</h1>
          <p className="text-gray-600 mt-2">Comece sua jornada verde</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="name"
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={loading}
          >
            {loading ? "Criando conta..." : "Cadastrar"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Já tem uma conta?{" "}
            <Link
              to="/login"
              className="text-green-600 hover:text-green-700 font-semibold"
            >
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
