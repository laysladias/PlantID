import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Search, Mic, MicOff, Sprout, Sparkles, Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { logMissingSearch } from "../../lib/db";
import { generatePlantWithAI } from "../../lib/plantAi";
import { searchPlants, CatalogPlant } from "../../lib/plantCatalog";

// Web Speech API não tem tipagem padrão no TS — declaramos o mínimo necessário
type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const SEARCH_DEBOUNCE_MS = 400;

export function SearchPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<CatalogPlant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNotFoundTerm, setAiNotFoundTerm] = useState<string | null>(null);

  // Busca no catálogo (banco) enquanto a pessoa digita. É rápido e não gasta IA.
  useEffect(() => {
    const term = searchQuery.trim();
    setAiNotFoundTerm(null);

    if (!term) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const plants = await searchPlants(term);
      setResults(plants);
      setIsSearching(false);
      setHasSearched(true);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Gera a ficha com IA (só quando a pessoa pede) e abre a planta.
  const handleAiSearch = async () => {
    const term = searchQuery.trim();
    if (!term || aiLoading) return;
    setAiLoading(true);
    const result = await generatePlantWithAI(term);
    setAiLoading(false);

    if (result.status === "ok") {
      navigate(`/plant/${result.plantId}`);
    } else if (result.status === "not_found") {
      setAiNotFoundTerm(term);
      logMissingSearch(term);
    } else {
      toast.error(result.message);
    }
  };

  const voiceSupported = !!getSpeechRecognition();

  const handleVoiceSearch = async () => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) {
      toast.error("Busca por voz não é suportada neste navegador.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: any) {
        if (err?.name === "NotAllowedError") {
          toast.error(
            "Permissão de microfone negada. Habilite o acesso ao microfone para este site nas configurações do navegador."
          );
        } else if (err?.name === "NotFoundError") {
          toast.error("Nenhum microfone foi encontrado neste dispositivo.");
        } else {
          toast.error("Não foi possível acessar o microfone. Tente novamente.");
        }
        return;
      }
    }

    const recognition = new SpeechRecognitionClass();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      setSearchQuery(transcript);
    };

    recognition.onerror = (event: any) => {
      const errorType = event?.error;
      if (errorType === "not-allowed" || errorType === "permission-denied") {
        toast.error(
          "Permissão de microfone negada. Habilite o acesso ao microfone para este site nas configurações do navegador."
        );
      } else if (errorType === "no-speech") {
        toast.error("Nenhuma fala foi detectada. Tente falar novamente.");
      } else if (errorType === "audio-capture") {
        toast.error("Nenhum microfone foi encontrado neste dispositivo.");
      } else if (errorType === "network") {
        toast.error("Erro de conexão durante o reconhecimento de voz. Verifique sua internet.");
      } else {
        toast.error("Não foi possível reconhecer o áudio. Tente novamente.");
      }
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Buscar Plantas
        </h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Nome da planta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {voiceSupported && (
            <button
              onClick={handleVoiceSearch}
              aria-label={isListening ? "Parar busca por voz" : "Buscar por voz"}
              className={`px-3 rounded-lg border transition-colors ${
                isListening
                  ? "bg-red-600 border-red-600 text-white animate-pulse"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Busque por qualquer planta: se não estiver no catálogo, nossa IA monta a ficha para você.
        </p>
      </div>

      <div className="space-y-3">
        {isSearching && (
          <div className="text-center py-12">
            <p className="text-gray-500">Buscando...</p>
          </div>
        )}

        {!isSearching && hasSearched && results.length === 0 && !aiNotFoundTerm && !aiLoading && (
          <Card className="p-5 text-center border-green-200 bg-green-50/50">
            <Sprout className="w-10 h-10 text-green-400 mx-auto mb-2" />
            <p className="text-gray-700 font-medium">Essa planta ainda não está no nosso catálogo</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Nossa inteligência artificial pode montar a ficha de cuidados dela agora.
            </p>
            <Button onClick={handleAiSearch} className="bg-green-600 hover:bg-green-700 w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar ficha com IA
            </Button>
          </Card>
        )}

        {aiLoading && (
          <Card className="p-6 text-center">
            <Loader2 className="w-8 h-8 text-green-600 mx-auto mb-2 animate-spin" />
            <p className="text-gray-700 font-medium">Gerando a ficha com IA...</p>
            <p className="text-xs text-gray-500 mt-1">Isso leva alguns segundos.</p>
          </Card>
        )}

        {aiNotFoundTerm && !aiLoading && (
          <div className="text-center py-8 px-6">
            <Sprout className="w-10 h-10 text-green-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">
              Não reconhecemos “{aiNotFoundTerm}” como uma planta
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Confira a escrita ou tente o nome científico. Anotamos sua busca para melhorar o catálogo.
            </p>
          </div>
        )}

        {!isSearching &&
          results.map((plant) => (
            <Card
              key={plant.id}
              onClick={() => navigate(`/plant/${plant.id}`)}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex gap-4">
                {plant.image ? (
                  <img
                    src={plant.image}
                    alt={plant.name}
                    className="w-28 h-28 object-cover bg-gray-100"
                  />
                ) : (
                  <div className="w-28 h-28 flex items-center justify-center bg-green-50 shrink-0">
                    <Sprout className="w-10 h-10 text-green-300" />
                  </div>
                )}
                <div className="flex-1 p-3 flex flex-col justify-center">
                  <h3 className="font-semibold text-gray-800">{plant.name}</h3>
                  {plant.scientificName && (
                    <p className="text-xs text-gray-500 italic mt-1">
                      {plant.scientificName}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}

        {!isSearching && !aiLoading && results.length > 0 && (
          <button
            onClick={handleAiSearch}
            className="w-full flex items-center justify-center gap-2 text-sm text-green-700 py-3 rounded-lg border border-dashed border-green-300 hover:bg-green-50"
          >
            <Sparkles className="w-4 h-4" />
            Não é essa? Gerar ficha de “{searchQuery.trim()}” com IA
          </button>
        )}
      </div>
    </div>
  );
}
