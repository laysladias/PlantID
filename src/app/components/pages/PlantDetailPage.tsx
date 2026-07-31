import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Droplet, Sun, ThermometerSun, AlertTriangle, Heart, Plus, Dog, Cat } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { getPlantById, addMyPlant, Plant } from "../../lib/db";
import { toast } from "sonner";
import { Badge } from "../ui/badge";

function formatHumidity(raw: string): string {
  if (!raw) return "—";
  // Se já for descritivo, mantém; se for só percentual, deixa mais claro
  if (/%/.test(raw) && !/umidade/i.test(raw)) {
    return `Umidade relativa do ar ideal: ${raw}`;
  }
  return raw;
}

export function PlantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getPlantById(id).then((p) => {
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

  const handleCheckLight = () => {
    navigate("/light-meter", {
      state: {
        plantName: plant.name,
        lightMin: plant.lightIntensityMin,
        lightMax: plant.lightIntensityMax,
        lightRequirement: plant.lightRequirement,
      },
    });
  };

  return (
    <div className="pb-6">
      <div className="relative">
        <img
          src={plant.images[0]}
          alt={plant.name}
          className="w-full h-64 object-cover"
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
          <p className="text-gray-500 italic">{plant.scientificName}</p>
          <div className="flex gap-2 mt-2">
            <Badge className="bg-green-100 text-green-700">
              {plant.careLevel}
            </Badge>
            <Badge className="bg-blue-100 text-blue-700">
              {plant.lightRequirement}
            </Badge>
          </div>
        </div>

        <Card className="p-4">
          <p className="text-gray-700">{plant.description}</p>
        </Card>

        {(plant.toxicity.dangerousToDogs || plant.toxicity.dangerousToCats) && (
          <Card className="p-4 bg-orange-50 border-orange-200">
            <div className="flex gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-800">
                  ⚠️ Alerta de Toxicidade
                </h3>
                <p className="text-sm text-orange-700 mt-1">
                  Esta planta é tóxica para:
                </p>
                <div className="flex gap-3 mt-2">
                  {plant.toxicity.dangerousToDogs && (
                    <div className="flex items-center gap-1 text-sm text-orange-700">
                      <Dog className="w-4 h-4" />
                      Cães
                    </div>
                  )}
                  {plant.toxicity.dangerousToCats && (
                    <div className="flex items-center gap-1 text-sm text-orange-700">
                      <Cat className="w-4 h-4" />
                      Gatos
                    </div>
                  )}
                </div>
                {plant.toxicity.symptoms && (
                  <p className="text-xs text-orange-600 mt-2">
                    Sintomas: {plant.toxicity.symptoms}
                  </p>
                )}
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
                <p className="text-sm text-gray-600">{plant.wateringFrequency}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="bg-yellow-100 p-2 rounded-lg h-fit">
                <Sun className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">Luz</p>
                <p className="text-sm text-gray-600">{plant.lightRequirement}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Ideal: {plant.lightIntensityMin}–{plant.lightIntensityMax} lux
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="bg-orange-100 p-2 rounded-lg h-fit">
                <ThermometerSun className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">Temperatura Ideal</p>
                <p className="text-sm text-gray-600">{plant.idealTemperature}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-gray-800 mb-3">
            Informações Adicionais
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600 shrink-0">Umidade do ar:</span>
              <span className="font-medium text-gray-800 text-right">
                {formatHumidity(plant.humidity)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600 shrink-0">Solo:</span>
              <span className="font-medium text-gray-800 text-right">{plant.soilType}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600 shrink-0">Fertilização:</span>
              <span className="font-medium text-gray-800 text-right">{plant.fertilization}</span>
            </div>
          </div>
        </Card>

        <div className="space-y-2">
          <Button
            onClick={handleAddToMyPlants}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Adicionar às Minhas Plantas
          </Button>
          <Button
            onClick={handleCheckLight}
            variant="outline"
            className="w-full"
          >
            Verificar Luminosidade
          </Button>
        </div>
      </div>
    </div>
  );
}
