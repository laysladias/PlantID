import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Search, Mic, MicOff, Sprout, Sparkles, Loader2, MessageCircle } from "lucide-react";
import { FlowerPot, FlowerSprig } from "../Illustrations";
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
const AI_IDLE_MS = 700;

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
  const [aiError, setAiError] = useState<string | null>(null);
  const latestTermRef = useRef("");
  const aiRunRef = useRef(0);

  // Gera a ficha com IA e abre a planta. Roda sozinho quando a planta não está
  // no catálogo, e também pelo botão (tentar de novo / "não é essa?").
  const runAi = async (term: string) => {
    const run = ++aiRunRef.current;
    setAiLoading(true);
    setAiError(null);
    setAiNotFoundTerm(null);

    const result = await generatePlantWithAI(term);
    if (run !== aiRunRef.current) return; // a pessoa já digitou outra coisa
    setAiLoading(false);

    if (result.status === "ok") {
      if (latestTermRef.current === term) navigate(`/plant/${result.plantId}`);
    } else if (result.status === "not_found") {
      setAiNotFoundTerm(term);
      logMissingSearch(term);
    } else {
      setAiError(result.message);
    }
  };

  // Busca no catálogo (banco) enquanto a pessoa digita. É rápido e não gasta IA.
  // Se não achar nada, a IA entra automaticamente para montar a ficha.
  useEffect(() => {
    const term = searchQuery.trim();
    latestTermRef.current = term;
    aiRunRef.current++; // cancela qualquer geração em andamento de um termo anterior
    setAiLoading(false);
    setAiNotFoundTerm(null);
    setAiError(null);

    if (!term) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    let cancelled = false;
    let aiTimer: ReturnType<typeof setTimeout> | undefined;

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const plants = await searchPlants(term);
      if (cancelled) return;
      setResults(plants);
      setIsSearching(false);
      setHasSearched(true);

      if (plants.length === 0 && term.length >= 3) {
        // Espera a pessoa parar de digitar antes de chamar a IA (poupa o limite grátis).
        setAiLoading(true);
        aiTimer = setTimeout(() => {
          if (!cancelled) runAi(term);
        }, AI_IDLE_MS);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(aiTimer);
    };
  }, [searchQuery]);

  const handleAiSearch = () => {
    const term = searchQuery.trim();
    if (!term || aiLoading) return;
    runAi(term);
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
          Busque por qualquer planta: se não estiver no catálogo, nossa IA monta a ficha para você automaticamente.
        </p>
      </div>

      <div className="space-y-3">
        {isSearching && (
          <div className="text-center py-12">
            <p className="text-gray-500">Buscando...</p>
          </div>
        )}

        {!searchQuery.trim() && (
          <div className="text-center pt-8">
            <FlowerPot className="w-28 h-28 mx-auto text-leaf-300" />
            <p className="text-sm text-gray-500 mt-2">Digite o nome de uma planta para começar</p>
          </div>
        )}

        {aiLoading && !isSearching && (
          <Card className="p-6 text-center">
            <Loader2 className="w-8 h-8 text-green-600 mx-auto mb-2 animate-spin" />
            <p className="text-gray-700 font-medium">Essa planta não está no catálogo. Montando a ficha...</p>
            <p className="text-xs text-gray-500 mt-1">Nossa IA está reunindo os cuidados dela, leva alguns segundos.</p>
          </Card>
        )}

        {aiError && !aiLoading && (
          <Card className="p-5 text-center border-green-200 bg-green-50/50 light-surface">
            <Sprout className="w-10 h-10 text-green-600 mx-auto mb-2" />
            <p className="text-gray-700 font-medium">Não consegui montar a ficha agora</p>
            <p className="text-sm text-gray-600 mt-1 mb-4">{aiError}</p>
            <Button onClick={handleAiSearch} className="bg-green-600 hover:bg-green-700 w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Tentar de novo
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/chat", { state: { ask: `Me fale sobre a planta ${searchQuery.trim()} e como cuidar dela.` } })}
              className="w-full mt-2"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Perguntar no chat
            </Button>
          </Card>
        )}

        {aiNotFoundTerm && !aiLoading && (
          <div className="text-center py-8 px-6">
            <FlowerSprig className="w-20 h-20 mx-auto mb-2 text-leaf-300" />
            <p className="text-gray-600 font-medium">
              Não reconhecemos “{aiNotFoundTerm}” como uma planta
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Confira a escrita ou tente o nome científico. Anotamos sua busca para melhorar o catálogo.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate("/chat", { state: { ask: `Você conhece uma planta chamada "${aiNotFoundTerm}"?` } })}
              className="mt-4"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Perguntar no chat
            </Button>
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
