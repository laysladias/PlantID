// Proteção básica contra "abrir o F12 e sair copiando o código".
//
// IMPORTANTE (para explicar na apresentação): nenhum site consegue esconder
// 100% o próprio código, porque o navegador precisa baixá-lo para rodar.
// O que fazemos aqui é DIFICULTAR para curiosos:
//   1. bloqueia as teclas de atalho (F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S);
//   2. bloqueia o clique direito (menos em campos de texto);
//   3. detecta o painel de desenvolvedor aberto (pelo "debugger") e cobre a tela com um aviso;
//   4. no build de produção o código sai minificado e SEM sourcemaps
//      (veja vite.config.ts), então o que aparece é ilegível.
// A segurança de verdade dos dados está no Supabase (RLS) e nas chaves
// secretas guardadas só no servidor (pasta /api) — nunca no navegador.

const OVERLAY_ID = "plantid-devtools-overlay";

function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

function showOverlay() {
  if (document.getElementById(OVERLAY_ID)) return;
  const div = document.createElement("div");
  div.id = OVERLAY_ID;
  div.setAttribute("role", "alert");
  div.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;background:#14301a;color:#fff;" +
    "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
    "text-align:center;padding:24px;font-family:system-ui,sans-serif;";
  div.innerHTML =
    '<div style="font-size:48px;margin-bottom:12px">🌿</div>' +
    '<h1 style="font-size:22px;margin:0 0 8px">Ferramentas de desenvolvedor detectadas</h1>' +
    '<p style="max-width:360px;margin:0;opacity:.85">Feche o painel de inspeção (F12) para continuar usando o PlantID.</p>';
  document.body.appendChild(div);
}

function hideOverlay() {
  document.getElementById(OVERLAY_ID)?.remove();
}

export function installDevtoolsGuard() {
  // Só em produção: durante o desenvolvimento (npm run dev) o F12 continua livre.
  if (!import.meta.env.PROD) return;
  if (typeof window === "undefined") return;

  // 1) Atalhos de teclado
  window.addEventListener(
    "keydown",
    (e) => {
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const blocked =
        e.key === "F12" ||
        (ctrl && e.shiftKey && ["i", "j", "c", "k"].includes(key)) || // painéis do DevTools
        (e.metaKey && e.altKey && ["i", "j", "c", "u"].includes(key)) || // atalhos do Mac (Cmd+Option)
        (ctrl && ["u", "s"].includes(key)); // ver código-fonte / salvar página
      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  // 2) Clique direito (mantém o menu normal em campos de texto, p/ colar etc.)
  window.addEventListener("contextmenu", (e) => {
    if (!isEditable(e.target)) e.preventDefault();
  });

  // 3) Detecção do painel aberto.
  // Obs.: NÃO comparamos o tamanho da janela (outerWidth x innerWidth), porque
  // isso dava "falso alarme" para quem usa zoom no navegador (algo comum em
  // acessibilidade) ou deixa um painel lateral aberto (favoritos, Gemini...).

  const checkByDebugger = () => {
    // Com o DevTools aberto, a instrução "debugger" pausa a execução;
    // fechado, ela é ignorada e o tempo medido é ~0 ms.
    const t0 = performance.now();
    try {
      // new Function evita que o minificador remova o "debugger"
      new Function("debugger")();
    } catch {
      /* ignora */
    }
    return performance.now() - t0 > 150;
  };

  const tick = () => {
    if (checkByDebugger()) showOverlay();
    else hideOverlay();
  };

  tick();
  setInterval(tick, 1000);
  window.addEventListener("resize", tick);
}
