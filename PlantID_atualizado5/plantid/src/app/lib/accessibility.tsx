import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ColorblindMode = "none" | "protanopia" | "deuteranopia" | "tritanopia";

interface AccessibilitySettings {
  highContrast: boolean;
  theme: ThemeMode;
  colorblindMode: ColorblindMode;
  fontScale: number; // 1 = 100%
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  highContrast: false,
  theme: "system",
  colorblindMode: "none",
  fontScale: 1,
};

const STORAGE_KEY = "plantid_accessibility";
const FONT_SCALE_MIN = 1;
const FONT_SCALE_MAX = 1.4;
const FONT_SCALE_STEP = 0.1;

interface AccessibilityContextValue extends AccessibilitySettings {
  setHighContrast: (value: boolean) => void;
  setTheme: (value: ThemeMode) => void;
  setColorblindMode: (value: ColorblindMode) => void;
  increaseFontScale: () => void;
  decreaseFontScale: () => void;
  resetFontScale: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

function loadSettings(): AccessibilitySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(loadSettings);

  // Aplica as configurações como classes/variáveis CSS no <html>
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = settings.theme === "dark" || (settings.theme === "system" && prefersDark);
    root.classList.toggle("dark", isDark);

    root.classList.toggle("high-contrast", settings.highContrast);

    root.classList.remove(
      "colorblind-protanopia",
      "colorblind-deuteranopia",
      "colorblind-tritanopia"
    );
    if (settings.colorblindMode !== "none") {
      root.classList.add(`colorblind-${settings.colorblindMode}`);
    }

    // theme.css já usa "html { font-size: var(--font-size) }" — sobrescrever essa
    // variável escala o app inteiro (Tailwind usa rem para textos e espaçamentos)
    root.style.setProperty("--font-size", `${Math.round(16 * settings.fontScale)}px`);
  }, [settings]);

  // Acompanha mudanças no tema do sistema quando o modo é "system"
  useEffect(() => {
    if (settings.theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => document.documentElement.classList.toggle("dark", mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [settings.theme]);

  const value: AccessibilityContextValue = {
    ...settings,
    setHighContrast: (v) => setSettings((s) => ({ ...s, highContrast: v })),
    setTheme: (v) => setSettings((s) => ({ ...s, theme: v })),
    setColorblindMode: (v) => setSettings((s) => ({ ...s, colorblindMode: v })),
    increaseFontScale: () =>
      setSettings((s) => ({
        ...s,
        fontScale: Math.min(FONT_SCALE_MAX, Math.round((s.fontScale + FONT_SCALE_STEP) * 100) / 100),
      })),
    decreaseFontScale: () =>
      setSettings((s) => ({
        ...s,
        fontScale: Math.max(FONT_SCALE_MIN, Math.round((s.fontScale - FONT_SCALE_STEP) * 100) / 100),
      })),
    resetFontScale: () => setSettings((s) => ({ ...s, fontScale: 1 })),
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error("useAccessibility deve ser usado dentro de <AccessibilityProvider>");
  }
  return ctx;
}
