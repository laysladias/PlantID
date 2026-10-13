import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { Leaf, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/button";
import { LeafSprig, FlowerSprig } from "../Illustrations";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { toast } from "sonner";
import { login, resetPassword } from "../../lib/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // Se a pessoa pediu para redefinir a senha neste aparelho, mostramos um
  // lembrete: ela pode trocar a senha pelo celular e voltar aqui para entrar.
  const [resetPending, setResetPending] = useState(false);
  useEffect(() => {
    try {
      const ts = Number(localStorage.getItem("plantid_reset_pending") || 0);
      setResetPending(ts > 0 && Date.now() - ts < 60 * 60 * 1000);
    } catch {}
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { user, error } = await login(email, password);

    if (error || !user) {
      toast.error(error ?? "Não foi possível entrar. Confira email e senha.");
      setLoading(false);
      return;
    }

    try {
      localStorage.removeItem("plantid_reset_pending");
    } catch {}
    toast.success("Login realizado com sucesso!");
    navigate("/");
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error("Informe o email da sua conta.");
      return;
    }
    setForgotLoading(true);
    const { error } = await resetPassword(forgotEmail.trim());
    setForgotLoading(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(
      "Se existir uma conta com este email, enviamos um link para redefinir a senha. Confira sua caixa de entrada e o spam."
    );
    closeForgot();
  };

  const closeForgot = () => {
    setForgotOpen(false);
    setForgotEmail("");
  };

  return (
    <div className="min-h-screen bg-brand-auth flex items-center justify-center p-4 relative overflow-hidden">
      <LeafSprig className="absolute -left-10 -top-6 w-56 h-56 text-leaf-300 opacity-25 pointer-events-none" />
      <FlowerSprig className="absolute left-2 bottom-6 w-36 h-36 text-leaf-300 opacity-70 pointer-events-none" />
      <LeafSprig className="absolute -right-12 bottom-4 w-64 h-64 text-leaf-300 opacity-20 pointer-events-none rotate-180" />
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-green-100 p-4 rounded-full mb-4">
            <Leaf className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">PlantID</h1>
          <p className="text-gray-600 mt-2">Cuide das suas plantas com amor</p>
        </div>

        {resetPending && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 light-surface">
            Você pediu para redefinir a senha. Abra o link que chegou no email
            (pode ser pelo celular) e, depois de criar a nova senha, entre aqui
            normalmente com ela.
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
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
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
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
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setForgotEmail(email);
                setForgotOpen(true);
              }}
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              Esqueci minha senha
            </button>
          </div>

          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Não tem uma conta?{" "}
            <Link
              to="/signup"
              className="text-green-600 hover:text-green-700 font-semibold"
            >
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>

      <Dialog
        open={forgotOpen}
        onOpenChange={(open) => {
          if (open) setForgotOpen(true);
          else closeForgot();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperar senha</DialogTitle>
            <DialogDescription>
              Informe o email da sua conta. Enviaremos um link para redefinir a senha (verifique também a pasta de spam).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                type="email"
                placeholder="seu@email.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={forgotLoading}
            >
              {forgotLoading ? "Enviando..." : "Enviar link"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
