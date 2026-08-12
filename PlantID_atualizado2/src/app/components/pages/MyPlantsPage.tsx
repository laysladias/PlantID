import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, AlertTriangle, Trash2 } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { getMyPlants, deleteMyPlant, MyPlant } from "../../lib/db";

export function MyPlantsPage() {
  const navigate = useNavigate();
  const [myPlants, setMyPlants] = useState<MyPlant[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPlants = () => {
    getMyPlants().then((plants) => {
      setMyPlants(plants);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadPlants();
  }, []);

  const handleDelete = async (plantId: string) => {
    const { error } = await deleteMyPlant(plantId);
    if (error) {
      toast.error("Não foi possível remover a planta.");
      return;
    }
    toast.success("Planta removida da sua coleção");
    loadPlants();
  };

  const getDaysUntilWatering = (nextWatering: Date | null) => {
    if (!nextWatering) return 0;
    const today = new Date();
    const diffTime = nextWatering.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-gray-500">Carregando suas plantas...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Minhas Plantas</h2>
          <p className="text-gray-600 mt-1">{myPlants.length} plantas na coleção</p>
        </div>
        <Button
          onClick={() => navigate("/search")}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {myPlants.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="max-w-sm mx-auto">
            <div className="bg-gray-100 p-6 rounded-full w-fit mx-auto mb-4">
              <Plus className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">
              Nenhuma planta ainda
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Comece adicionando suas primeiras plantas para acompanhar os cuidados
            </p>
            <Button
              onClick={() => navigate("/search")}
              className="bg-green-600 hover:bg-green-700"
            >
              Adicionar Planta
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {myPlants.map((plant) => {
            const daysUntil = getDaysUntilWatering(plant.nextWatering);
            const needsWater = daysUntil <= 0;

            return (
              <Card key={plant.id} className="overflow-hidden">
                <div className="flex gap-4">
                  <img
                    src={plant.image}
                    alt={plant.name}
                    className="w-24 h-24 object-cover cursor-pointer"
                    onClick={() => navigate(`/plant/${plant.plantId}`)}
                  />
                  <div className="flex-1 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3
                          className="font-semibold text-gray-800 cursor-pointer hover:text-green-600"
                          onClick={() => navigate(`/plant/${plant.plantId}`)}
                        >
                          {plant.nickname}
                        </h3>
                        <p className="text-xs text-gray-500 italic">{plant.name}</p>
                        {plant.location && (
                          <p className="text-xs text-gray-600 mt-1">📍 {plant.location}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(plant.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs px-2 py-1 shrink-0"
                        aria-label="Remover planta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      {needsWater ? (
                        <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          Precisa de atenção — veja os lembretes
                        </div>
                      ) : (
                        <div className="text-xs text-gray-600">
                          Próxima rega em {daysUntil} {daysUntil === 1 ? "dia" : "dias"}
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/plant/${plant.plantId}`)}
                      className="text-xs mt-3"
                    >
                      Ver cuidados
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
