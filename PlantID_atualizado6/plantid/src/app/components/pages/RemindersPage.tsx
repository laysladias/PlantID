import { useEffect, useMemo, useState } from "react";
import { Bell, Droplet, Leaf, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "sonner";
import {
  getReminders,
  addReminder as addReminderDb,
  toggleReminder as toggleReminderDb,
  deleteReminder as deleteReminderDb,
  markReminderDone,
  getMyPlants,
  getPlants,
  waterMyPlant,
  Reminder,
  MyPlant,
  Plant,
} from "../../lib/db";

export function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  // Plantas que a pessoa realmente possui (coleção) — é entre essas que dá
  // pra criar um lembrete, já que o lembrete é sempre de uma planta sua.
  const [myPlants, setMyPlants] = useState<MyPlant[]>([]);
  // Catálogo de espécies, só usado pra sugerir a frequência de cuidado
  // (rega/fertilização) de cada planta da coleção.
  const [catalogPlants, setCatalogPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReminders = () => {
    getReminders().then((data) => {
      setReminders(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadReminders();
    getMyPlants().then(setMyPlants);
    getPlants().then(setCatalogPlants);
  }, []);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newReminder, setNewReminder] = useState({
    userPlantId: "",
    type: "watering" as "watering" | "fertilization",
    frequency: "",
  });

  // Campo de busca da planta no formulário de novo lembrete: a pessoa digita
  // e escolhe entre as plantas da própria coleção que batem com o texto,
  // em vez de rolar uma lista enorme.
  const [plantSearch, setPlantSearch] = useState("");
  const [showPlantSuggestions, setShowPlantSuggestions] = useState(false);

  const displayName = (p: MyPlant) => p.nickname || p.name;

  const filteredPlants = useMemo(() => {
    const term = plantSearch.trim().toLowerCase();
    if (!term) return myPlants.slice(0, 8);
    return myPlants
      .filter((p) => displayName(p).toLowerCase().includes(term))
      .slice(0, 8);
  }, [myPlants, plantSearch]);

  const resetNewReminderForm = () => {
    setNewReminder({ userPlantId: "", type: "watering", frequency: "" });
    setPlantSearch("");
    setShowPlantSuggestions(false);
  };

  const handleSelectPlant = (plant: MyPlant) => {
    setNewReminder((prev) => ({ ...prev, userPlantId: plant.id }));
    setPlantSearch(displayName(plant));
    setShowPlantSuggestions(false);
  };

  // A frequência é determinada automaticamente pela planta e pelo tipo de
  // cuidado escolhidos, em vez de o usuário digitar manualmente.
  useEffect(() => {
    const myPlant = myPlants.find((p) => p.id === newReminder.userPlantId);
    if (!myPlant) return;
    const catalogPlant = catalogPlants.find((p) => p.id === myPlant.plantId);
    if (!catalogPlant) return;
    const suggestedFrequency =
      newReminder.type === "watering"
        ? catalogPlant.wateringFrequency
        : catalogPlant.fertilization;
    setNewReminder((prev) => ({ ...prev, frequency: suggestedFrequency || "" }));
  }, [newReminder.userPlantId, newReminder.type, myPlants, catalogPlants]);

  const handleToggleReminder = async (id: string, current: boolean) => {
    const { error } = await toggleReminderDb(id, !current);
    if (error) {
      toast.error("Não foi possível atualizar o lembrete.");
      return;
    }
    toast.success("Lembrete atualizado");
    loadReminders();
  };

  const handleDeleteReminder = async (id: string) => {
    const { error } = await deleteReminderDb(id);
    if (error) {
      toast.error("Não foi possível remover o lembrete.");
      return;
    }
    toast.success("Lembrete removido");
    loadReminders();
  };

  const handleMarkDone = async (reminder: Reminder) => {
    // Além de empurrar a data do lembrete, se ele estiver ligado a uma
    // planta da coleção e for uma rega, também atualizamos a "próxima
    // rega" dessa planta em Minhas Plantas — assim os dois lugares do app
    // ficam sincronizados e o aviso da Home some corretamente.
    const tasks = [markReminderDone(reminder.id, reminder.type === "watering" ? 7 : 30)];
    if (reminder.type === "watering" && reminder.userPlantId) {
      tasks.push(waterMyPlant(reminder.userPlantId));
    }

    const results = await Promise.all(tasks);
    const error = results.find((r) => r.error)?.error;

    if (error) {
      toast.error("Não foi possível atualizar.");
      return;
    }

    toast.success(
      reminder.type === "watering"
        ? "Rega registrada! Próximo aviso em ~7 dias."
        : "Fertilização registrada!"
    );
    loadReminders();
    getMyPlants().then(setMyPlants);
  };

  const handleAddReminder = async () => {
    if (!newReminder.userPlantId || !newReminder.frequency) {
      toast.error("Escolha uma planta da sua coleção antes de continuar.");
      return;
    }

    const myPlant = myPlants.find((p) => p.id === newReminder.userPlantId);
    if (!myPlant) return;

    const { error } = await addReminderDb({
      userPlantId: myPlant.id,
      plantName: displayName(myPlant),
      type: newReminder.type,
      frequency: newReminder.frequency,
      nextDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    if (error) {
      toast.error("Não foi possível criar o lembrete.");
      return;
    }

    setIsDialogOpen(false);
    resetNewReminderForm();
    toast.success("Lembrete criado com sucesso!");
    loadReminders();
  };

  const getDaysUntil = (date: Date) => {
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  const activeReminders = reminders.filter((r) => r.enabled);
  // Central de lembretes: em vez de depender de notificação (que só chega
  // com o app aberto), tudo que vence hoje ou já venceu aparece destacado
  // aqui assim que a pessoa abre a Agenda.
  const todayReminders = activeReminders.filter((r) => getDaysUntil(r.nextDate) <= 0);
  const upcomingReminders = activeReminders.filter(
    (r) => getDaysUntil(r.nextDate) > 0 && getDaysUntil(r.nextDate) <= 3
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Agenda</h2>
          <p className="text-gray-600 mt-1">{activeReminders.length} ativos</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetNewReminderForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Lembrete</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2 relative">
                <Label htmlFor="plant-search">Planta (da sua coleção)</Label>
                <Input
                  id="plant-search"
                  placeholder="Digite o nome da planta..."
                  value={plantSearch}
                  onChange={(e) => {
                    setPlantSearch(e.target.value);
                    setShowPlantSuggestions(true);
                    if (newReminder.userPlantId) {
                      setNewReminder((prev) => ({ ...prev, userPlantId: "" }));
                    }
                  }}
                  onFocus={() => setShowPlantSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowPlantSuggestions(false), 150)}
                  autoComplete="off"
                  disabled={myPlants.length === 0}
                />
                {myPlants.length === 0 && (
                  <p className="text-xs text-gray-500">
                    Você ainda não tem plantas na sua coleção. Adicione uma em
                    "Minhas Plantas" antes de criar um lembrete.
                  </p>
                )}
                {showPlantSuggestions && filteredPlants.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredPlants.map((plant) => (
                      <button
                        type="button"
                        key={plant.id}
                        onMouseDown={() => handleSelectPlant(plant)}
                        className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm text-gray-700"
                      >
                        {displayName(plant)}
                      </button>
                    ))}
                  </div>
                )}
                {showPlantSuggestions && plantSearch && filteredPlants.length === 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-500">
                    Nenhuma planta encontrada
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={newReminder.type}
                  onValueChange={(value: "watering" | "fertilization") =>
                    setNewReminder({ ...newReminder, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="watering">Rega</SelectItem>
                    <SelectItem value="fertilization">Fertilização</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Frequência</Label>
                <Input
                  readOnly
                  placeholder="Escolha uma planta para ver a frequência recomendada"
                  value={newReminder.frequency}
                  className="bg-gray-50 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500">
                  Calculada automaticamente com base nos dados da planta selecionada.
                </p>
              </div>

              <Button
                onClick={handleAddReminder}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Criar Lembrete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Central de lembretes de hoje */}
      <Card className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-5 h-5 text-orange-600" />
          <h3 className="font-semibold text-orange-800">Lembretes de hoje</h3>
        </div>
        {todayReminders.length === 0 ? (
          <p className="text-sm text-orange-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Tudo em dia por aqui! 🎉
          </p>
        ) : (
          <div className="space-y-2">
            {todayReminders.map((reminder) => {
              const Icon = reminder.type === "watering" ? Droplet : Leaf;
              return (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between gap-2 bg-white/70 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        reminder.type === "watering" ? "text-blue-600" : "text-green-600"
                      }`}
                    />
                    <span className="text-sm text-gray-800 truncate">
                      {reminder.plantName} —{" "}
                      {reminder.type === "watering" ? "regar hoje" : "verificar fertilização"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleMarkDone(reminder)}
                    className="bg-green-600 hover:bg-green-700 text-xs h-7 flex-shrink-0"
                  >
                    Já cuidei
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Upcoming reminders */}
      {upcomingReminders.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-sky-50 border-blue-200">
          <div className="flex gap-3">
            <Bell className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-800">Chegando</h3>
              <p className="text-sm text-blue-700 mt-1">
                Você tem {upcomingReminders.length}{" "}
                {upcomingReminders.length === 1 ? "lembrete" : "lembretes"} para os
                próximos 3 dias
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Reminders list */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Todos os lembretes
        </h3>
        {reminders.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="max-w-sm mx-auto">
              <div className="bg-gray-100 p-6 rounded-full w-fit mx-auto mb-4">
                <Bell className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">
                Nenhum lembrete configurado
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Crie lembretes para não esquecer de cuidar das suas plantas
              </p>
            </div>
          </Card>
        ) : (
          reminders.map((reminder) => {
            const daysUntil = getDaysUntil(reminder.nextDate);
            const isUrgent = daysUntil <= 1 && reminder.enabled;
            const Icon = reminder.type === "watering" ? Droplet : Leaf;

            return (
              <Card
                key={reminder.id}
                className={`p-4 ${isUrgent ? "border-orange-300 bg-orange-50" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      reminder.type === "watering"
                        ? "bg-blue-100"
                        : "bg-green-100"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        reminder.type === "watering"
                          ? "text-blue-600"
                          : "text-green-600"
                      }`}
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          {reminder.plantName}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {reminder.type === "watering" ? "Rega" : "Fertilização"} •{" "}
                          {reminder.frequency}
                        </p>
                      </div>
                      <Switch
                        checked={reminder.enabled}
                        onCheckedChange={() => handleToggleReminder(reminder.id, reminder.enabled)}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                      <div className="text-sm">
                        {daysUntil <= 0 ? (
                          <span className="text-red-600 font-medium">
                            {reminder.type === "watering" ? "Regue sua planta hoje!" : "Fertilize hoje!"}
                          </span>
                        ) : daysUntil === 1 ? (
                          <span className="text-orange-600 font-medium">Amanhã</span>
                        ) : (
                          <span className="text-gray-600">
                            {formatDate(reminder.nextDate)} • Em {daysUntil} dias
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {daysUntil <= 1 && reminder.enabled && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkDone(reminder)}
                            className="bg-green-600 hover:bg-green-700 text-xs h-8"
                          >
                            Já cuidei
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteReminder(reminder.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
