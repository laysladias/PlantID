import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Leaf, Mail, Lock, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { updatePassword } from "../../lib/auth";

/**
 * Tela para onde o link "Redefinir senha" do email de recuperação aponta.
 *
 * Quando o usuário abre esse link, o Supabase (client-side, via
 * detectSessionInUrl) lê o token que vem na URL e cria uma sessão de
 * recuperação automaticamente. Por isso não pedimos a senha atual aqui:
 * validamos é se essa sessão de recuperação existe.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [linkInvalid, setLinkInvalid] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    // Se o Supabase já processou o link e criou a sessão de recuperação,
    // getSession() já retorna o usuário. Também escutamos o evento
    // PASSWORD_RECOVERY para o caso de o processamento da URL ainda estar
    // em andamento quando este componente montar.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session?.user?.email) {
        setEmail(data.session.user.email);
        setChecking(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && session?.user?.email) {
        setEmail(session.user.email);
        setChecking(false);
      }
    });

    // Dá um tempo para o Supabase processar o token da URL antes de
    // desistir e mostrar "link inválido".
    const timeout = setTimeout(() => {
      if (!active) return;
      setChecking(false);
      setEmail((current) => {
        if (!current) setLinkInvalid(true);
        return current;
      });
    }, 4000);

    return () => {
      active = false;
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem!");
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success("Senha redefinida com sucesso! Faça login com a nova senha.");
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-green-100 p-4 rounded-full mb-4">
            <Leaf className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Redefinir Senha</h1>
          <p className="text-gray-600 mt-2 text-center">
            Escolha uma nova senha para sua conta
          </p>
        </div>

        {checking ? (
          <p className="text-center text-gray-500 py-6">Verificando link...</p>
        ) : linkInvalid ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">
                Este link de redefinição é inválido ou já expirou. Solicite um
                novo link na tela de login.
              </p>
            </div>
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => navigate("/login")}
            >
              Voltar para o login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email ?? ""}
                  readOnly
                  disabled
                  className="pl-10 bg-gray-50 text-gray-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
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
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
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
              {loading ? "Salvando..." : "Redefinir senha"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
