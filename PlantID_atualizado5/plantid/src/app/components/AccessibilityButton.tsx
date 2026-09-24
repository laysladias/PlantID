import { useState } from "react";
import {
  Accessibility,
  Contrast,
  Sun,
  Moon,
  MonitorSmartphone,
  Eye,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "./ui/drawer";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { useAccessibility, type ColorblindMode, type ThemeMode } from "../lib/accessibility";

const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Automático", icon: MonitorSmartphone },
];

const colorblindOptions: { value: ColorblindMode; label: string }[] = [
  { value: "none", label: "Nenhum" },
  { value: "protanopia", label: "Protanopia" },
  { value: "deuteranopia", label: "Deuteranopia" },
  { value: "tritanopia", label: "Tritanopia" },
];

export function AccessibilityButton() {
  const [open, setOpen] = useState(false);
  const {
    highContrast,
    setHighContrast,
    theme,
    setTheme,
    colorblindMode,
    setColorblindMode,
    fontScale,
    increaseFontScale,
    decreaseFontScale,
    resetFontScale,
  } = useAccessibility();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir opções de acessibilidade"
        className="fixed bottom-24 right-4 z-40 bg-green-600 hover:bg-green-700 text-white rounded-full p-3 shadow-lg transition-colors"
      >
        <Accessibility className="w-6 h-6" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Accessibility className="w-5 h-5 text-green-600" />
              Acessibilidade
            </DrawerTitle>
            <DrawerDescription>
              Ajuste a exibição do app para a sua necessidade
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-6 space-y-6 overflow-y-auto">
            {/* Alto contraste */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <Contrast className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">Alto Contraste</p>
                  <p className="text-xs text-gray-500">Aumenta o contraste das cores</p>
                </div>
              </div>
              <Switch checked={highContrast} onCheckedChange={setHighContrast} />
            </div>

            {/* Tema */}
            <div>
              <p className="font-medium text-gray-800 mb-2">Tema</p>
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = theme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setTheme(opt.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                        isActive
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Daltonismo */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <Eye className="w-5 h-5 text-gray-700" />
                </div>
                <p className="font-medium text-gray-800">Paleta para Daltonismo</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {colorblindOptions.map((opt) => {
                  const isActive = colorblindMode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setColorblindMode(opt.value)}
                      className={`p-2.5 rounded-lg border text-sm transition-colors ${
                        isActive
                          ? "border-green-600 bg-green-50 text-green-700 font-medium"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tamanho da fonte */}
            <div>
              <p className="font-medium text-gray-800 mb-2">Tamanho da Fonte</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={decreaseFontScale}
                  aria-label="Diminuir fonte"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <div className="flex-1 text-center text-sm text-gray-600">
                  {Math.round(fontScale * 100)}%
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={increaseFontScale}
                  aria-label="Aumentar fonte"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetFontScale}
                  aria-label="Restaurar tamanho padrão"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
