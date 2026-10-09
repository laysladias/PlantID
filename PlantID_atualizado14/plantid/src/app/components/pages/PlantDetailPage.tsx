import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Droplet,
  Sun,
  AlertTriangle,
  Heart,
  Plus,
  PawPrint,
  Sprout,
  Thermometer,
  Wind,
  Layers,
  Leaf,
  Sparkles,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { addMyPlant } from "../../lib/db";
import { getPlantDetails, PlantDetails } from "../../lib/plantCatalog";
import { fetchPlantImage } from "../../lib/plantImage";
import { toast } from "sonner";
import { Badge } from "../ui/badge";

function InfoRow({
  icon,
  color,
  label,
  value,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: string;
}) {
  if (!value || value === "Não informado") return null;
  return (
    <div className="flex gap-3">
      <div className={`${color} p-2 rounded-lg h-fit`}>{icon}</div>
      <div className="flex-1">
        <p className="font-medium text-gray-800">{label}</p>
        <p className="text-sm text-gray-600">{value}</p>
      </div>
    </div>
  );
}

export function PlantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plant, setPlant] = useState<PlantDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getPlantDetails(id).then(async (p) => {
      if (cancelled) return;
      setPlant(p);
      setLoading(false);
      // Planta sem foto: tenta buscar uma na Wikipédia.
      if (p && !p.image) {
        const image = await fetchPlantImage(p.scientificName, p.name);
        if (!cancelled && image) setPlant((current) => (current ? { ...current, image } : current));
      }
    });
    return () => {
      cancelled = true;
    };
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
      <div className="p-4 space-y-3">
        <p className="text-gray-700">Planta não encontrada.</p>
        <Button variant="outline" onClick={() => navigate("/search")}>
          Voltar para a busca
        </Button>
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
      if (error === "Usuário não está logado.") {
        toast.error("Entre na sua conta para adicionar plantas.");
      } else {
        console.error("Erro ao adicionar planta:", error);
        toast.error(`Não foi possível adicionar: ${error}`);
      }
      return;
    }

    if (alreadyExists) {
      toast.info(`${plant.name} já está na sua coleção.`);
      return;
    }

    toast.success(`${plant.name} adicionada às suas plantas!`);
  };

  const isToxic = plant.poisonousToPets || plant.poisonousToHumans;
  const toxicityUnknown = plant.toxicityLevel.toLowerCase() === "desconhecida";

  return (
    <div className="pb-6">
      <div className="relative">
        {plant.image ? (
          <img src={plant.image} alt={plant.name} className="w-full h-64 object-cover bg-gray-100" />
        ) : (
          <div className="w-full h-64 flex items-center justify-center bg-green-50">
            <Sprout className="w-16 h-16 text-green-300" />
          </div>
        )}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-white/90 p-2 rounded-full shadow-lg"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <button
          onClick={handleAddToMyPlants}
          className="absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow-lg"
          aria-label="Adicionar às minhas plantas"
        >
          <Heart className="w-6 h-6 text-rose" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{plant.name}</h1>
          {plant.scientificName && <p className="text-gray-500 italic">{plant.scientificName}</p>}
          <div className="flex gap-2 mt-2 flex-wrap">
            {plant.careLevel && plant.careLevel !== "Não informado" && (
              <Badge className="bg-green-100 text-green-700">Cuidado: {plant.careLevel}</Badge>
            )}
            {plant.aiGenerated && (
              <Badge className="bg-purple-100 text-purple-700">
                <Sparkles className="w-3 h-3 mr-1" />
                Gerada por IA
              </Badge>
            )}
          </div>
        </div>

        <Card className="p-4">
          <p className="text-gray-700">{plant.description}</p>
        </Card>

        {(isToxic || toxicityUnknown) && (
          <Card className="p-4 bg-orange-50 border-orange-200">
            <div className="flex gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-orange-800">⚠️ Alerta de Toxicidade</h3>
                {toxicityUnknown && (
                  <p className="text-sm text-orange-700 mt-1">
                    Não temos certeza sobre a toxicidade desta planta. Por precaução, mantenha longe de
                    animais e crianças.
                  </p>
                )}
                <div className="flex flex-col gap-1 mt-2">
                  {plant.poisonousToPets && (
                    <div className="flex items-center gap-1 text-sm text-orange-700">
                      <PawPrint className="w-4 h-4" />
                      {toxicityUnknown ? "Possível risco" : "Tóxica"} para animais de estimação
                    </div>
                  )}
                  {plant.poisonousToHumans && (
                    <div className="flex items-center gap-1 text-sm text-orange-700">
                      <AlertTriangle className="w-4 h-4" />
                      {toxicityUnknown ? "Possível risco" : "Tóxica"} para humanos
                    </div>
                  )}
                </div>
                {plant.toxicitySymptoms && (
                  <p className="text-xs text-orange-700 mt-2">Sintomas: {plant.toxicitySymptoms}</p>
                )}
              </div>
            </div>
          </Card>
        )}

        <Card className="p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Guia de Cuidados</h3>
          <div className="space-y-3">
            <InfoRow
              icon={<Droplet className="w-5 h-5 text-blue-600" />}
              color="bg-blue-100"
              label="Rega"
              value={plant.wateringFrequency}
            />
            <InfoRow
              icon={<Sun className="w-5 h-5 text-yellow-600" />}
              color="bg-yellow-100"
              label="Luz"
              value={plant.sunlight}
            />
            <InfoRow
              icon={<Thermometer className="w-5 h-5 text-red-600" />}
              color="bg-red-100"
              label="Temperatura ideal"
              value={plant.idealTemperature}
            />
            <InfoRow
              icon={<Wind className="w-5 h-5 text-cyan-600" />}
              color="bg-cyan-100"
              label="Umidade do ar"
              value={plant.humidity}
            />
            <InfoRow
              icon={<Layers className="w-5 h-5 text-amber-700" />}
              color="bg-amber-100"
              label="Solo"
              value={plant.soilType}
            />
            <InfoRow
              icon={<Leaf className="w-5 h-5 text-green-600" />}
              color="bg-green-100"
              label="Adubação"
              value={plant.fertilization}
            />
          </div>
        </Card>

        {plant.aiGenerated && (
          <p className="text-xs text-gray-500 text-center px-2">
            Esta ficha foi gerada por inteligência artificial e pode conter imprecisões. Confirme com um
            especialista, principalmente sobre toxicidade para pessoas e animais.
          </p>
        )}

        <Button onClick={handleAddToMyPlants} className="w-full bg-green-600 hover:bg-green-700">
          <Plus className="w-5 h-5 mr-2" />
          Adicionar às Minhas Plantas
        </Button>
      </div>
    </div>
  );
}
