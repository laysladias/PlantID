import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Droplet, Sun, AlertTriangle, Heart, Plus, PawPrint } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { addMyPlant } from "../../lib/db";
import { getPerenualPlantDetails, PerenualPlantDetails } from "../../lib/perenual";
import { toast } from "sonner";
import { Badge } from "../ui/badge";

export function PlantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plant, setPlant] = useState<PerenualPlantDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getPerenualPlantDetails(id).then((p) => {
      setPlant(p);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="p-4">
        <p>Planta não encontrada</p>
      </div>
    );
  }

  const handleAddToMyPlants = async () => {
    const { error, alreadyExists } = await addMyPlant({
      plantId: plant.id,
      name: plant.name,
      scientificName: plant.scientificName,
      image: plant.image,
      nickname: plant.name,
      location: "",
    });

    if (error) {
      toast.error("Não foi possível adicionar. Verifique se você está logado.");
      return;
    }

    if (alreadyExists) {
      toast.info(`${plant.name} já está na sua coleção.`);
      return;
    }

    toast.success(`${plant.name} adicionada às suas plantas!`);
  };

  const isToxic = plant.poisonousToPets || plant.poisonousToHumans;

  return (
    <div className="pb-6">
      <div className="relative">
        <img
          src={plant.image}
          alt={plant.name}
          className="w-full h-64 object-cover bg-gray-100"
        />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-white/90 p-2 rounded-full shadow-lg"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          onClick={handleAddToMyPlants}
          className="absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow-lg"
        >
          <Heart className="w-6 h-6 text-red-500" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{plant.name}</h1>
          {plant.scientificName && (
            <p className="text-gray-500 italic">{plant.scientificName}</p>
          )}
          <div className="flex gap-2 mt-2 flex-wrap">
            {plant.careLevel && plant.careLevel !== "Não informado" && (
              <Badge className="bg-green-100 text-green-700">
                {plant.careLevel}
              </Badge>
            )}
            {plant.indoor && (
              <Badge className="bg-blue-100 text-blue-700">
                Planta de interior
              </Badge>
            )}
          </div>
        </div>

        <Card className="p-4">
          <p className="text-gray-700">{plant.description}</p>
        </Card>

        {isToxic && (
          <Card className="p-4 bg-orange-50 border-orange-200">
            <div className="flex gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-800">
                  ⚠️ Alerta de Toxicidade
                </h3>
                <div className="flex flex-col gap-1 mt-2">
                  {plant.poisonousToPets && (
                    <div className="flex items-center gap-1 text-sm text-orange-700">
                      <PawPrint className="w-4 h-4" />
                      Tóxica para animais de estimação
                    </div>
                  )}
                  {plant.poisonousToHumans && (
                    <div className="flex items-center gap-1 text-sm text-orange-700">
                      <AlertTriangle className="w-4 h-4" />
                      Tóxica para humanos
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-4">
          <h3 className="font-semibold text-gray-800 mb-3">
            Guia de Cuidados
          </h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="bg-blue-100 p-2 rounded-lg h-fit">
                <Droplet className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">Rega</p>
                <p className="text-sm text-gray-600">{plant.watering}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="bg-yellow-100 p-2 rounded-lg h-fit">
                <Sun className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">Luz</p>
                <p className="text-sm text-gray-600">{plant.sunlight}</p>
              </div>
            </div>
          </div>
        </Card>

        <Button
          onClick={handleAddToMyPlants}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Adicionar às Minhas Plantas
        </Button>
      </div>
    </div>
  );
}
