import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Leaf, Mail, Lock, User as UserIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { signup } from "../../lib/auth";

export function SignUpPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem!");
      return;
    }

    setLoading(true);

    const { user, error } = await signup(name, email, password);

    if (error) {
      toast.error(error);
      setLoading(false);
      return;
    }

    if (!user) {
      toast.error("Não foi possível criar a conta.");
      setLoading(false);
      return;
    }

    if (localStorage.getItem("plantid_user")) {
      toast.success("Conta criada com sucesso!");
      navigate("/");
    } else {
      toast.success("Conta criada! Confirme seu email para poder entrar.");
      navigate("/login");
    }

    setLoading(false);
  };

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
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                required
              />
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
