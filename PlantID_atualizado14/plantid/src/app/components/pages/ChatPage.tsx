import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Send, Sprout, Bot, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { getMyPlants } from "../../lib/db";
import { askPlantChat, type ChatMessage } from "../../lib/plantChat";
import { PlantPot } from "../Illustrations";

const STORAGE_KEY = "plantid_chat";
const MAX_LENGTH = 500;

const SUGGESTIONS = [
  "Por que as folhas da minha planta estão amarelando?",
  "Como saber se estou regando demais?",
  "Quais plantas combinam com pouca luz?",
  "Como cuidar de uma planta com pets em casa?",
];

function loadHistory(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export function ChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>(loadHistory);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plantNames, setPlantNames] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // A IA conhece os nomes das plantas da pessoa só para personalizar a resposta.
  useEffect(() => {
    getMyPlants().then((list) => {
      setPlantNames(list.map((p) => p.nickname || p.name).filter(Boolean));
    });
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      // sem armazenamento: segue sem guardar o histórico
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const content = text.trim().slice(0, MAX_LENGTH);
    if (!content || loading) return;

    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setError(null);
    setLoading(true);

    const result = await askPlantChat(next, plantNames);
    setLoading(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }
    setMessages([...next, { role: "assistant", content: result.reply }]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-2 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-700"
          aria-label="Voltar para o início"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-800 leading-tight">Assistente de plantas</h2>
          <p className="text-xs text-gray-500">Tire dúvidas sobre cuidados e jardinagem</p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="text-xs text-green-700 font-medium px-2 py-1">
            Nova conversa
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3" aria-live="polite">
        {messages.length === 0 && (
          <div className="text-center pt-4">
            <PlantPot className="w-24 h-24 mx-auto text-leaf-300" />
            <p className="font-semibold text-gray-800 mt-2">Olá! Sou a assistente do PlantID.</p>
            <p className="text-sm text-gray-600 mt-1">
              Pergunte sobre rega, luz, pragas, adubo, pets e muito mais.
            </p>
            <div className="mt-4 space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full text-left text-sm bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700 hover:border-green-600"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="bg-leaf-800 text-white rounded-full p-1.5 h-fit mr-2 mt-1 shrink-0">
                <Sprout className="w-4 h-4" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                m.role === "user"
                  ? "bg-green-600 text-white rounded-br-sm"
                  : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Bot className="w-4 h-4 animate-pulse" /> Pensando...
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 light-surface">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="bg-white border-t border-gray-200 p-3 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={MAX_LENGTH}
            placeholder="Escreva sua dúvida..."
            aria-label="Mensagem para a assistente"
            className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm outline-none focus:border-green-600"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-full bg-green-600 hover:bg-green-700 px-4"
            aria-label="Enviar"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-[11px] text-gray-500 mt-2 text-center">
          A IA pode errar. Em caso de planta ingerida por pet ou pessoa, procure um veterinário ou serviço de saúde.
        </p>
      </div>
    </div>
  );
}
