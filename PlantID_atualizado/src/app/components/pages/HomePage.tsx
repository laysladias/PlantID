import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Search, Lightbulb, Cloud, Leaf, Bell } from "lucide-react";
import { Card } from "../ui/card";
import { getDailyTips, getMyPlants, getReminders, DailyTip, MyPlant, Reminder } from "../../lib/db";

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

export function HomePage() {
  const navigate = useNavigate();
  const [dailyTip, setDailyTip] = useState<DailyTip | null>(null);
  const [myPlants, setMyPlants] = useState<MyPlant[]>([]);
  const [dueReminders, setDueReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    getDailyTips().then((tips) => setDailyTip(pickTodayTip(tips)));
    getMyPlants().then(setMyPlants);
    getReminders().then((list) => {
      setDueReminders(
        list.filter((r) => r.enabled && getDaysUntil(r.nextDate) <= 0)
      );
    });
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
  const needsWaterCount = myPlants.filter((p) => {
    if (!p.nextWatering) return false;
    return getDaysUntil(p.nextWatering) <= 0;
  }).length;
  const pendingCareCount = Math.max(dueReminders.length, needsWaterCount);

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
      {pendingCareCount > 0 && (
        <Card
          className="p-4 cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-br from-orange-50 to-red-50 border-orange-200"
          onClick={() => navigate("/reminders")}
        >
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-full">
              <Bell className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-800">
                ⚠️ Você possui {pendingCareCount}{" "}
                {pendingCareCount === 1 ? "cuidado pendente" : "cuidados pendentes"} hoje
              </p>
              <p className="text-xs text-orange-700 mt-0.5">Ver meus cuidados</p>
            </div>
            <span className="text-orange-400">›</span>
          </div>
        </Card>
      )}

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
