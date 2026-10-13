import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router";
import { Lightbulb, Sun, CameraOff, Camera, CheckCircle2, AlertTriangle, Search, X } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { searchPlants, getPlantDetails, getLightIntensityRange, CatalogPlant } from "../../lib/plantCatalog";

function brightnessToLux(brightness: number): number {
  const normalized = Math.min(Math.max(brightness / 255, 0), 1);
  const lux = Math.pow(normalized, 1.8) * 20000;
  return Math.round(lux);
}

type LocationState = {
  plantName?: string;
  lightRequirement?: string;
  lightIntensityMin?: number | null;
  lightIntensityMax?: number | null;
} | null;

const SEARCH_DEBOUNCE_MS = 500;

export function LightMeterPage() {
  const location = useLocation();
  const plantCtx = (location.state as LocationState) ?? null;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [lightLevel, setLightLevel] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Busca de planta (no catálogo) para comparar a luz medida com a
  // categoria de luz que ela precisa.
  const [plantSearch, setPlantSearch] = useState(plantCtx?.plantName ?? "");
  const [searchResults, setSearchResults] = useState<CatalogPlant[]>([]);
  const [isSearchingPlants, setIsSearchingPlants] = useState(false);
  const [showPlantSuggestions, setShowPlantSuggestions] = useState(false);
  const [selectedComparison, setSelectedComparison] = useState<{
    plantName: string;
    lightRequirement: string;
    lightIntensityMin?: number | null;
    lightIntensityMax?: number | null;
  } | null>(null);
  const [loadingSelection, setLoadingSelection] = useState(false);

  useEffect(() => {
    const term = plantSearch.trim();
    if (!term || selectedComparison) {
      setSearchResults([]);
      return;
    }
    setIsSearchingPlants(true);
    const timer = setTimeout(async () => {
      const results = await searchPlants(term);
      setSearchResults(results);
      setIsSearchingPlants(false);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [plantSearch, selectedComparison]);

  const handleSelectPlant = async (plant: CatalogPlant) => {
    setPlantSearch(plant.name);
    setShowPlantSuggestions(false);
    setLoadingSelection(true);
    const details = await getPlantDetails(plant.id);
    setLoadingSelection(false);
    if (details) {
      setSelectedComparison({
        plantName: details.name,
        lightRequirement: details.sunlight,
        lightIntensityMin: details.lightIntensityMin,
        lightIntensityMax: details.lightIntensityMax,
      });
    }
  };

  const handleClearPlant = () => {
    setSelectedComparison(null);
    setPlantSearch("");
    setSearchResults([]);
  };

  // Se veio da tela de detalhe de uma planta específica, usa aquela
  // comparação até a pessoa escolher outra pela busca.
  const activeComparison = selectedComparison ?? plantCtx;

  function handleTakePhotoClick() {
    setCameraError(null);
    fileInputRef.current?.click();
  }

  function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) {
      setCameraError(
        "Nenhuma foto foi capturada. Verifique se a permissão de câmera está habilitada para este site e tente novamente."
      );
      return;
    }

    if (!file.type.startsWith("image/")) {
      setCameraError("O arquivo selecionado não é uma imagem.");
      return;
    }

    setIsProcessing(true);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    const img = new Image();
    img.onload = () => {
      measureBrightnessFromImage(img);
      setIsProcessing(false);
    };
    img.onerror = () => {
      setCameraError("Não foi possível processar a foto. Tente novamente.");
      setIsProcessing(false);
    };
    img.src = objectUrl;
  }

  function measureBrightnessFromImage(img: HTMLImageElement) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sampleWidth = 64;
    const sampleHeight = 48;
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
    const frame = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = frame.data;

    let total = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      total += 0.299 * r + 0.587 * g + 0.114 * b;
      count++;
    }

    const avgBrightness = total / count;
    setLightLevel(brightnessToLux(avgBrightness));
  }

  const getLightDescription = (lux: number) => {
    if (lux < 500) return "Luz muito baixa";
    if (lux < 1000) return "Luz indireta baixa";
    if (lux < 2500) return "Luz indireta média";
    if (lux < 5000) return "Luz indireta brilhante";
    return "Luz solar direta";
  };

  const comparison = (() => {
    if (lightLevel === null || !activeComparison?.lightRequirement) return null;
    const range = getLightIntensityRange(
      activeComparison.lightRequirement,
      activeComparison.lightIntensityMin,
      activeComparison.lightIntensityMax
    );
    if (!range) return null;
    const tooLow = lightLevel < range.min;
    const tooHigh = lightLevel > range.max;
    const direction: "more-light" | "less-light" | null = tooLow ? "more-light" : tooHigh ? "less-light" : null;
    const acceptable = (tooLow && lightLevel >= range.min * 0.8) || (tooHigh && lightLevel <= range.max * 1.2);
    return {
      ok: !tooLow && !tooHigh,
      acceptable,
      direction,
    };
  })();

  const comparisonRange = activeComparison?.lightRequirement
    ? getLightIntensityRange(activeComparison.lightRequirement, activeComparison.lightIntensityMin, activeComparison.lightIntensityMax)
    : null;

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Medidor de Luz</h2>
        <p className="text-gray-600 mt-1">
          Verifique se o ambiente está adequado
        </p>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoSelected}
      />

      <Card className="light-surface p-6 bg-gradient-to-br from-yellow-50 to-orange-50">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div
              className={`bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full p-8 shadow-lg transition-all ${
                isProcessing ? "animate-pulse" : ""
              }`}
            >
              <Lightbulb className="w-16 h-16 text-white" />
            </div>
          </div>

          <div className="text-center mt-6">
            <div className="text-5xl font-bold text-gray-800">
              {lightLevel ?? "--"}
            </div>
            <div className="text-gray-600 mt-1">lux (estimado)</div>
            <div className="text-sm text-gray-500 mt-2">
              {lightLevel === null
                ? "Tire uma foto do ambiente para medir"
                : getLightDescription(lightLevel)}
            </div>
          </div>
        </div>
      </Card>

      {/* Buscar planta para comparar a luz medida */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-800 mb-2">Comparar com uma planta</h3>
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Digite o nome da planta..."
              value={plantSearch}
              onChange={(e) => {
                setPlantSearch(e.target.value);
                setShowPlantSuggestions(true);
                if (selectedComparison) setSelectedComparison(null);
              }}
              onFocus={() => setShowPlantSuggestions(true)}
              onBlur={() => setTimeout(() => setShowPlantSuggestions(false), 150)}
              autoComplete="off"
              className="pl-9 pr-9"
            />
            {plantSearch && (
              <button
                type="button"
                onClick={handleClearPlant}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {showPlantSuggestions && isSearchingPlants && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-500">
              Buscando...
            </div>
          )}
          {showPlantSuggestions && !isSearchingPlants && searchResults.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map((plant) => (
                <button
                  type="button"
                  key={plant.id}
                  onMouseDown={() => handleSelectPlant(plant)}
                  className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm text-gray-700"
                >
                  {plant.name}
                </button>
              ))}
            </div>
          )}
          {showPlantSuggestions &&
            !isSearchingPlants &&
            plantSearch &&
            searchResults.length === 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-500">
                Nenhuma planta encontrada
              </div>
            )}
        </div>
        {loadingSelection && (
          <p className="text-xs text-gray-500 mt-2">Carregando dados da planta...</p>
        )}
      </Card>

      {/* Comparação com a planta escolhida (buscada aqui ou vinda da tela de detalhe) */}
      {activeComparison?.plantName && activeComparison.lightRequirement && (
        <Card className="p-4 border-green-200 bg-green-50/50">
          <h3 className="font-semibold text-gray-800 mb-2">
            Comparação — {activeComparison.plantName}
          </h3>
          <p className="text-sm text-gray-700">
            Luz necessária:{" "}
            <span className="font-semibold">{activeComparison.lightRequirement}</span>
          </p>
          {comparisonRange && (
            <p className="text-sm text-gray-700 mt-1">
              Faixa de referência: <span className="font-semibold">{comparisonRange.min.toLocaleString("pt-BR")}–{comparisonRange.max.toLocaleString("pt-BR")} lux</span>
            </p>
          )}
          {lightLevel !== null && (
            <p className="text-sm text-gray-700 mt-1">
              Luminosidade medida: <span className="font-semibold">{lightLevel.toLocaleString("pt-BR")} lux (estimado)</span>
            </p>
          )}
          {comparison && (
            <div
              className={`mt-3 flex items-start gap-2 text-sm rounded-lg p-3 ${
                comparison.ok
                  ? "bg-green-100 text-green-800"
                  : "bg-orange-100 text-orange-800"
              }`}
            >
              {comparison.ok ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <span>
                {comparison.ok
                  ? "A luminosidade medida combina com o que esta planta precisa. Pode deixar neste lugar."
                  : comparison.direction === "more-light"
                    ? comparison.acceptable
                      ? "Está próximo do ideal, mas um pouco escuro para ela. Deixe em um lugar com mais luminosidade, como mais perto de uma janela."
                      : "Está bem mais escuro do que esta planta precisa. Leve para um lugar com muito mais luminosidade, como perto de uma janela ou em um local com mais sol."
                    : comparison.acceptable
                      ? "Está próximo do ideal, mas um pouco claro demais para ela. Deixe em um lugar com mais sombra, por exemplo um pouco mais longe da janela."
                      : "Está bem mais claro do que esta planta precisa. Leve para um lugar com bem mais sombra, longe do sol direto."}
              </span>
            </div>
          )}
          {lightLevel === null && (
            <p className="text-xs text-gray-500 mt-2">
              Tire uma foto para comparar com o que a planta precisa.
            </p>
          )}
        </Card>
      )}

      {previewUrl && (
        <Card className="overflow-hidden">
          <img src={previewUrl} alt="Foto usada na medição" className="w-full h-40 object-cover" />
        </Card>
      )}

      {cameraError && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <CameraOff className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700">{cameraError}</p>
          </div>
        </Card>
      )}

      <Button
        onClick={handleTakePhotoClick}
        disabled={isProcessing}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        <Camera className="w-4 h-4 mr-2" />
        {isProcessing ? "Processando foto..." : "Tirar Foto para Medir"}
      </Button>

      <Card className="p-4">
        <div className="flex gap-3">
          <Sun className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-800">Como usar</h3>
            <p className="text-sm text-gray-600 mt-1">
              Toque em "Tirar Foto para Medir", permita o acesso à câmera quando
              solicitado e fotografe o ambiente onde a planta está. O app analisa
              o brilho da foto para estimar a intensidade luminosa do local.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
