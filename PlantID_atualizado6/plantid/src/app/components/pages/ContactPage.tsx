import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../ui/accordion";
import { toast } from "sonner";
import { sendContactMessage } from "../../lib/db";

// TODO: troque pelo e-mail definitivo do grupo assim que decidirem.
const CONTACT_EMAIL = "plantid.tcc@gmail.com";

const FAQ_ITEMS = [
  {
    question: "Como eu identifico uma planta pelo app?",
    answer:
      "Vá em 'Buscar', digite o nome (ou use a busca por voz) e escolha a planta na lista de resultados pra ver os detalhes e o guia de cuidados.",
  },
  {
    question: "Não encontrei minha planta na busca, e agora?",
    answer:
      "Sem problema — registramos automaticamente buscas sem resultado pra ampliar nosso catálogo. Você também pode nos avisar por aqui, pelo formulário abaixo.",
  },
  {
    question: "Como funciona o Medidor de Luz?",
    answer:
      "Ele usa a câmera do seu dispositivo pra estimar o nível de luminosidade do ambiente e te ajuda a comparar com o que uma planta específica precisa.",
  },
  {
    question: "Esqueci minha senha, como recupero o acesso?",
    answer:
      "Na tela de login, toque em 'Esqueci minha senha' e siga as instruções enviadas para o seu e-mail cadastrado.",
  },
];

export function ContactPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !message.trim()) {
      toast.error("Preencha todos os campos antes de enviar.");
      return;
    }

    setSending(true);
    const { error } = await sendContactMessage({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      message: message.trim(),
    });
    setSending(false);

    if (error) {
      toast.error("Não foi possível enviar sua mensagem. Tente novamente.");
      return;
    }

    toast.success("Mensagem enviada! Em breve entraremos em contato.");
    setFirstName("");
    setLastName("");
    setEmail("");
    setMessage("");
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="p-2 -ml-2 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Contato e Suporte</h2>
      </div>

      <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50">
        <h3 className="font-semibold text-gray-800 mb-1">Fale Conosco</h3>
        <div className="flex items-center gap-2 text-sm text-gray-700 mt-2">
          <Mail className="w-4 h-4 text-green-700" />
          <span>{CONTACT_EMAIL}</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Respondemos por e-mail o quanto antes. Você também pode usar o
          formulário abaixo — a mensagem chega direto pra gente.
        </p>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Entre em Contato</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Nome"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              placeholder="Sobrenome"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <Input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Textarea
            placeholder="Sua mensagem"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            required
          />
          <Button
            type="submit"
            disabled={sending}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? "Enviando..." : "Enviar Mensagem"}
          </Button>
        </form>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold text-gray-800 mb-2">
          Perguntas Frequentes
        </h3>
        <Accordion type="single" collapsible>
          {FAQ_ITEMS.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-sm text-left">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-gray-600">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>
    </div>
  );
}
