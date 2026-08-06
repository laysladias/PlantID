import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Mail, LogOut, Info, Camera, X } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { toast } from "sonner";
import { logout } from "../../lib/auth";

const AVATAR_STORAGE_PREFIX = "plantid_avatar_";
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export function ProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const storedUser = JSON.parse(localStorage.getItem("plantid_user") || "{}");
  const avatarKey = `${AVATAR_STORAGE_PREFIX}${storedUser.id || "guest"}`;

  const [avatarUrl, setAvatarUrl] = useState<string | null>(() =>
    localStorage.getItem(avatarKey)
  );
  const [aboutOpen, setAboutOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success("Logout realizado com sucesso!");
    navigate("/login");
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;

        const canvas = document.createElement("canvas");
        const outputSize = 320;
        canvas.width = outputSize;
        canvas.height = outputSize;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          localStorage.setItem(avatarKey, rawDataUrl);
          setAvatarUrl(rawDataUrl);
          toast.success("Foto de perfil atualizada!");
          return;
        }

        ctx.drawImage(img, sx, sy, size, size, 0, 0, outputSize, outputSize);
        const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.9);

        localStorage.setItem(avatarKey, croppedDataUrl);
        setAvatarUrl(croppedDataUrl);
        toast.success("Foto de perfil atualizada!");
      };
      img.onerror = () => toast.error("Não foi possível processar a imagem.");
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Perfil</h2>

      <Card className="light-surface p-6 bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => avatarUrl && setPreviewOpen(true)}
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
              aria-label="Ampliar foto de perfil"
            >
              <Avatar className="size-16">
                <AvatarImage src={avatarUrl ?? undefined} alt={storedUser.name || "Usuário"} />
                <AvatarFallback className="bg-green-600 text-white text-xl font-semibold">
                  {(storedUser.name || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
            <button
              onClick={handleAvatarClick}
              aria-label="Alterar foto de perfil"
              className="absolute -bottom-1 -right-1 bg-green-600 hover:bg-green-700 text-white rounded-full p-1.5 shadow"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800">
              {storedUser.name || "Usuário"}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
              <Mail className="w-4 h-4" />
              {storedUser.email || "email@exemplo.com"}
            </div>
            {avatarUrl && (
              <p className="text-xs text-gray-500 mt-1">Toque na foto para ampliar</p>
            )}
          </div>
        </div>
      </Card>

      {/* Preview ampliado da foto */}
      {previewOpen && avatarUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            className="absolute top-4 right-4 text-white p-2 rounded-full bg-black/40"
            onClick={() => setPreviewOpen(false)}
            aria-label="Fechar"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={avatarUrl}
            alt="Foto de perfil ampliada"
            className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <Card className="overflow-hidden">
        <button
          onClick={() => setAboutOpen(true)}
          className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
        >
          <Info className="w-5 h-5 text-gray-600" />
          <span className="flex-1 text-left text-gray-800">Sobre o App</span>
          <span className="text-gray-400">›</span>
        </button>
      </Card>

      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sobre o PlantID</DialogTitle>
            <DialogDescription asChild>
              <div className="text-sm text-gray-600 space-y-3 text-left mt-2">
                <p>
                  O PlantID é um aplicativo voltado à identificação e ao cuidado de
                  plantas, desenvolvido como Trabalho de Conclusão de Curso (TCC) da
                  ETEC Elias Nechar, unidade de Catanduva, São Paulo.
                </p>
                <p>
                  O projeto foi idealizado e desenvolvido por um grupo de quatro
                  alunas, com o objetivo de auxiliar usuários no manejo adequado de
                  suas plantas, oferecendo informações sobre luminosidade, rega,
                  clima local e lembretes de cuidado.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Button
        onClick={handleLogout}
        variant="outline"
        className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        <LogOut className="w-5 h-5 mr-2" />
        Sair da Conta
      </Button>

      <p className="text-center text-xs text-gray-500">PlantID v1.0.0</p>
    </div>
  );
}
