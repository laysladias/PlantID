import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Search, Mic, MicOff, Sprout } from "lucide-react";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { toast } from "sonner";
import { logMissingSearch } from "../../lib/db";
import { searchPerenualPlants, PerenualPlant } from "../../lib/perenual";

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

const SEARCH_DEBOUNCE_MS = 500;

export function SearchPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<PerenualPlant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const loggedEmptyRef = useRef<string | null>(null);

  // Busca com debounce: espera a pessoa parar de digitar antes de chamar a
  // API da Perenual, pra não estourar o limite diário de requisições.
  useEffect(() => {
    const term = searchQuery.trim();

    if (!term) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const plants = await searchPerenualPlants(term);
      setResults(plants);
      setIsSearching(false);
      setHasSearched(true);

      if (plants.length === 0 && loggedEmptyRef.current !== term) {
        loggedEmptyRef.current = term;
        logMissingSearch(term);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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
          A busca ignora acentos, maiúsculas/minúsculas e hífens.
        </p>
      </div>

      <div className="space-y-3">
        {isSearching && (
          <div className="text-center py-12">
            <p className="text-gray-500">Buscando...</p>
          </div>
        )}

        {!isSearching && hasSearched && results.length === 0 && (
          <div className="text-center py-12 px-6">
            <Sprout className="w-10 h-10 text-green-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">
              Ainda não encontramos essa planta
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Estamos sempre ampliando nosso catálogo — anotamos sua busca e
              em breve ela pode aparecer por aqui. Volte mais tarde!
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
                <img
                  src={plant.image}
                  alt={plant.name}
                  className="w-28 h-28 object-cover bg-gray-100"
                />
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
      </div>
    </div>
  );
}
