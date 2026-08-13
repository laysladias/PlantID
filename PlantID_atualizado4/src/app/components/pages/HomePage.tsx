import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Search, Lightbulb, Cloud, Leaf, Bell, Droplet, Sprout } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { toast } from "sonner";
import {
  getDailyTips,
  getMyPlants,
  getReminders,
  markReminderDone,
  waterMyPlant,
  DailyTip,
  MyPlant,
  Reminder,
} from "../../lib/db";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pickTodayTip(tips: DailyTip[]): DailyTip | null {
  if (tips.length === 0) return null;
  const dayIndex = Math.floor(Date.now() / MS_PER_DAY);
  return tips[dayIndex % tips.length];
}

function getDaysUntil(date: Date) {
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Um item de pendência pronto pra mostrar e resolver direto na Home, seja
// ele um lembrete da Agenda (rega ou fertilização) ou uma planta da coleção
// que está com a rega atrasada e ainda não tem lembrete nenhum.
type PendingItem = {
  key: string;
  label: string;
  type: "watering" | "fertilization";
  resolve: () => Promise<{ error: string | null }>;
};

export function HomePage() {
  const navigate = useNavigate();
  const [dailyTip, setDailyTip] = useState<DailyTip | null>(null);
  const [myPlants, setMyPlants] = useState<MyPlant[]>([]);
  const [dueReminders, setDueReminders] = useState<Reminder[]>([]);
  const [resolvingKey, setResolvingKey] = useState<string | null>(null);

  const loadPendingData = () => {
    getMyPlants().then(setMyPlants);
    getReminders().then((list) => {
      setDueReminders(list.filter((r) => r.enabled && getDaysUntil(r.nextDate) <= 0));
    });
  };

  useEffect(() => {
    getDailyTips().then((tips) => setDailyTip(pickTodayTip(tips)));
    loadPendingData();
  }, []);

  const quickActions = [
    {
      icon: Search,
      label: "Buscar Planta",
      color: "bg-blue-500",
      path: "/search",
    },
    {
      icon: Lightbulb,
      label: "Medir Luz",
      color: "bg-yellow-500",
      path: "/light-meter",
    },
    {
      icon: Cloud,
      label: "Ver Clima",
      color: "bg-sky-500",
      path: "/weather",
    },
    {
      icon: Leaf,
      label: "Minhas Plantas",
      color: "bg-green-500",
      path: "/my-plants",
    },
  ];

  const storedUser = JSON.parse(localStorage.getItem("plantid_user") || "{}");

  // Monta a lista de pendências reais, sem repetir a mesma planta duas
  // vezes: se já existe um lembrete vencido ligado a uma planta, usamos
  // ele; senão, se a própria planta está com a rega atrasada (mesmo sem
  // lembrete nenhum criado), ela também entra na lista.
  const reminderPlantIds = new Set(
    dueReminders.map((r) => r.userPlantId).filter((id): id is string => !!id)
  );

  const pendingItems: PendingItem[] = [
    ...dueReminders.map((r) => ({
      key: `reminder-${r.id}`,
      label: `${r.plantName} — ${r.type === "watering" ? "regar" : "fertilizar"}`,
      type: r.type,
      resolve: () => markReminderDone(r.id, r.type === "watering" ? 7 : 30),
    })),
    ...myPlants
      .filter(
        (p) =>
          p.nextWatering &&
          getDaysUntil(p.nextWatering) <= 0 &&
          !reminderPlantIds.has(p.id)
      )
      .map((p) => ({
        key: `plant-${p.id}`,
        label: `${p.nickname || p.name} — regar`,
        type: "watering" as const,
        resolve: () => waterMyPlant(p.id),
      })),
  ];

  const pendingCareCount = pendingItems.length;

  const handleResolve = async (item: PendingItem) => {
    setResolvingKey(item.key);
    const { error } = await item.resolve();
    setResolvingKey(null);

    if (error) {
      toast.error("Não foi possível atualizar. Tente novamente.");
      return;
    }

    toast.success("Cuidado registrado!");
    loadPendingData();
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          Olá, {storedUser.name || "Usuário"}! 👋
        </h2>
        <p className="text-gray-600 mt-1">
          Cuide bem das suas plantas hoje
        </p>
      </div>

      {/* Aviso automático de cuidados pendentes hoje */}
      <Card
        className={`p-4 ${
          pendingCareCount > 0
            ? "bg-gradient-to-br from-orange-50 to-red-50 border-orange-200"
            : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
        }`}
      >
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate("/reminders")}
        >
          <div className={`p-2 rounded-full ${pendingCareCount > 0 ? "bg-orange-100" : "bg-green-100"}`}>
            <Bell className={`w-5 h-5 ${pendingCareCount > 0 ? "text-orange-600" : "text-green-600"}`} />
          </div>
          <div className="flex-1">
            {pendingCareCount > 0 ? (
              <>
                <p className="text-sm font-medium text-orange-800">
                  ⚠️ Você possui {pendingCareCount}{" "}
                  {pendingCareCount === 1 ? "cuidado pendente" : "cuidados pendentes"} hoje
                </p>
                <p className="text-xs text-orange-700 mt-0.5">Ver agenda completa</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-green-800">
                  ✅ Todos os cuidados concluídos
                </p>
                <p className="text-xs text-green-700 mt-0.5">Ver agenda</p>
              </>
            )}
          </div>
          <span className={pendingCareCount > 0 ? "text-orange-400" : "text-green-400"}>›</span>
        </div>

        {pendingCareCount > 0 && (
          <div className="mt-3 space-y-2">
            {pendingItems.map((item) => {
              const Icon = item.type === "watering" ? Droplet : Sprout;
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-2 bg-white/70 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        item.type === "watering" ? "text-blue-600" : "text-green-600"
                      }`}
                    />
                    <span className="text-sm text-gray-800 truncate">{item.label}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleResolve(item)}
                    disabled={resolvingKey === item.key}
                    className="bg-green-600 hover:bg-green-700 text-xs h-7 flex-shrink-0"
                  >
                    {resolvingKey === item.key ? "..." : "Já cuidei"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          Ações Rápidas
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.label}
                onClick={() => navigate(action.path)}
                className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className={`${action.color} p-3 rounded-full`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {action.label}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {dailyTip && (
        <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="flex gap-3">
            <div className="bg-green-100 p-2 rounded-full h-fit">
              <Leaf className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-green-800">Dica do Dia</h4>
              <p className="text-sm text-green-700 mt-1">{dailyTip.content}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
