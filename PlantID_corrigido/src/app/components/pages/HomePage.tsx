import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Search, Lightbulb, Cloud, Leaf } from "lucide-react";
import { Card } from "../ui/card";
import { getDailyTips, DailyTip } from "../../lib/db";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Escolhe a dica do dia com base no dia atual, ciclando pela lista
// (ex.: com 5 dicas cadastradas, elas se repetem a cada 5 dias)
function pickTodayTip(tips: DailyTip[]): DailyTip | null {
  if (tips.length === 0) return null;
  const dayIndex = Math.floor(Date.now() / MS_PER_DAY);
  return tips[dayIndex % tips.length];
}

export function HomePage() {
  const navigate = useNavigate();
  const [dailyTip, setDailyTip] = useState<DailyTip | null>(null);

  useEffect(() => {
    getDailyTips().then((tips) => setDailyTip(pickTodayTip(tips)));
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

  return (
    <div className="p-4 space-y-6">
      {/* Welcome section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          Olá, {storedUser.name || "Usuário"}! 👋
        </h2>
        <p className="text-gray-600 mt-1">
          Cuide bem das suas plantas hoje
        </p>
      </div>

      {/* Quick actions */}
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

      {/* Daily tip */}
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
