import { useEffect, useState } from "react";
import { Bell, BellOff, Droplet, Leaf, Plus, Trash2 } from "lucide-react";
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
  getPlants,
  Reminder,
  Plant,
} from "../../lib/db";
import {
  getNotificationPermission,
  requestNotificationPermission,
  checkAndNotifyDueReminders,
} from "../../lib/notifications";

export function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState(
    getNotificationPermission()
  );

  const loadReminders = () => {
    getReminders().then((data) => {
      setReminders(data);
      setLoading(false);
      checkAndNotifyDueReminders(data);
    });
  };

  useEffect(() => {
    loadReminders();
    getPlants().then(setPlants);

    // Enquanto o app estiver aberto, verifica periodicamente se há lembretes
    // vencendo. Notificações com o app totalmente fechado exigem um servidor
    // de push (Web Push), que está fora do escopo de uma hospedagem estática.
    const interval = setInterval(() => {
      getReminders().then(checkAndNotifyDueReminders);
    }, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      toast.success("Notificações ativadas!");
      checkAndNotifyDueReminders(reminders);
    } else if (permission === "denied") {
      toast.error(
        "Permissão de notificação negada. Habilite nas configurações do navegador para receber os lembretes."
      );
    }
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newReminder, setNewReminder] = useState({
    plantId: "",
    type: "watering" as "watering" | "fertilization",
    frequency: "",
  });

  // A frequência é determinada automaticamente pela planta e pelo tipo de
  // cuidado escolhidos, em vez de o usuário digitar manualmente.
  useEffect(() => {
    const plant = plants.find((p) => p.id === newReminder.plantId);
    if (!plant) return;
    const suggestedFrequency =
      newReminder.type === "watering" ? plant.wateringFrequency : plant.fertilization;
    setNewReminder((prev) => ({ ...prev, frequency: suggestedFrequency || "" }));
  }, [newReminder.plantId, newReminder.type, plants]);

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

  const handleAddReminder = async () => {
    if (!newReminder.plantId || !newReminder.frequency) {
      toast.error("Preencha todos os campos");
      return;
    }

    const plant = plants.find((p) => p.id === newReminder.plantId);
    if (!plant) return;

    const { error } = await addReminderDb({
      userPlantId: null,
      plantName: plant.name,
      type: newReminder.type,
      frequency: newReminder.frequency,
      nextDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    if (error) {
      toast.error("Não foi possível criar o lembrete.");
      return;
    }

    setIsDialogOpen(false);
    setNewReminder({ plantId: "", type: "watering", frequency: "" });
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
  const upcomingReminders = activeReminders.filter((r) => getDaysUntil(r.nextDate) <= 3);

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Lembretes</h2>
          <p className="text-gray-600 mt-1">{activeReminders.length} ativos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              <div className="space-y-2">
                <Label>Planta</Label>
                <Select
                  value={newReminder.plantId}
                  onValueChange={(value) =>
                    setNewReminder({ ...newReminder, plantId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma planta" />
                  </SelectTrigger>
                  <SelectContent>
                    {plants.slice(0, 8).map((plant) => (
                      <SelectItem key={plant.id} value={plant.id}>
                        {plant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  placeholder="Selecione uma planta para ver a frequência recomendada"
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

      {/* Notification permission banner */}
      {notificationPermission !== null && notificationPermission !== "granted" && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <BellOff className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-blue-800">
                {notificationPermission === "denied"
                  ? "As notificações estão bloqueadas para este site. Habilite-as nas configurações do navegador para receber os avisos de rega e fertilização."
                  : "Ative as notificações para receber avisos quando for hora de regar ou fertilizar suas plantas."}
              </p>
              {notificationPermission === "default" && (
                <Button
                  size="sm"
                  onClick={handleEnableNotifications}
                  className="mt-2 bg-blue-600 hover:bg-blue-700"
                >
                  Ativar Notificações
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Upcoming reminders */}
      {upcomingReminders.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <div className="flex gap-3">
            <Bell className="w-6 h-6 text-orange-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-orange-800">Atenção Necessária</h3>
              <p className="text-sm text-orange-700 mt-1">
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

                    <div className="flex items-center justify-between mt-3">
                      <div className="text-sm">
                        {daysUntil <= 0 ? (
                          <span className="text-red-600 font-medium">Hoje!</span>
                        ) : daysUntil === 1 ? (
                          <span className="text-orange-600 font-medium">Amanhã</span>
                        ) : (
                          <span className="text-gray-600">
                            {formatDate(reminder.nextDate)} • Em {daysUntil} dias
                          </span>
                        )}
                      </div>

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
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
