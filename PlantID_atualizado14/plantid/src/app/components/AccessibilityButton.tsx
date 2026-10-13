import { useEffect, useRef, useState } from "react";
import {
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


/**
 * Símbolo internacional de acesso universal: a pessoa de braços abertos
 * dentro de um círculo (e não a cadeira de rodas).
 */
function UniversalAccessIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="7" r="1.4" fill="currentColor" stroke="none" />
      <path d="M6.5 9.8c3.6 1 7.4 1 11 0" />
      <path d="M12 10.6V14" />
      <path d="M12 14l-2.4 4.6" />
      <path d="M12 14l2.4 4.6" />
    </svg>
  );
}

const FAB_SIZE = 48; // px (p-3 + ícone de 24px)
const FAB_MARGIN = 8;
const FAB_POS_KEY = "plantid_a11y_fab_pos";
const DRAG_THRESHOLD = 6; // px: abaixo disso é um toque, acima é arrastar

type Pos = { x: number; y: number };

function clampPos(p: Pos): Pos {
  const maxX = window.innerWidth - FAB_SIZE - FAB_MARGIN;
  const maxY = window.innerHeight - FAB_SIZE - FAB_MARGIN;
  return {
    x: Math.min(Math.max(FAB_MARGIN, p.x), Math.max(FAB_MARGIN, maxX)),
    y: Math.min(Math.max(FAB_MARGIN, p.y), Math.max(FAB_MARGIN, maxY)),
  };
}

function loadInitialPos(): Pos {
  try {
    const raw = localStorage.getItem(FAB_POS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
        return clampPos(parsed);
      }
    }
  } catch {}
  // Posição padrão: canto inferior direito, acima da barra de navegação
  return clampPos({
    x: window.innerWidth - FAB_SIZE - 16,
    y: window.innerHeight - FAB_SIZE - 96,
  });
}

export function AccessibilityButton() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos>(loadInitialPos);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const justDraggedRef = useRef(false);
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


  // Mantém o botão dentro da tela se a janela mudar de tamanho / girar o celular
  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const savePos = (p: Pos) => {
    try {
      localStorage.setItem(FAB_POS_KEY, JSON.stringify(p));
    } catch {}
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
    }
    setPos(clampPos({ x: d.originX + dx, y: d.originY + dy }));
  };

  const endDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (d.moved) {
      justDraggedRef.current = true; // evita abrir o menu ao soltar o botão
      setTimeout(() => (justDraggedRef.current = false), 0);
      setDragging(false);
      setPos((p) => {
        savePos(p);
        return p;
      });
    }
  };

  const onClick = () => {
    if (justDraggedRef.current) return;
    setOpen(true);
  };

  // Teclado: com o botão em foco, as setas também movem (Enter/Espaço abre)
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 80 : 20;
    const delta: Record<string, Pos> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    setPos((p) => {
      const next = clampPos({ x: p.x + d.x, y: p.y + d.y });
      savePos(next);
      return next;
    });
  };

  return (
    <>
      <button
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        aria-label="Abrir opções de acessibilidade (arraste para mover)"
        title="Acessibilidade — arraste para mover"
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          touchAction: "none",
          cursor: dragging ? "grabbing" : "grab",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
        className={`a11y-fab fixed left-0 top-0 z-40 rounded-full p-3 border-2 border-white focus-visible:outline-2 focus-visible:outline-offset-2 ${
          dragging ? "scale-110 shadow-2xl" : "transition-colors"
        }`}
      >
        <UniversalAccessIcon className="w-6 h-6" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <UniversalAccessIcon className="w-5 h-5 text-blue-700" />
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
