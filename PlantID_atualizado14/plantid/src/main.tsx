
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { registerNotificationServiceWorker } from "./app/lib/notifications";
  import { supabase } from "./app/lib/supabase";
  import { router } from "./app/routes";

  registerNotificationServiceWorker();

  // Se o link de recuperação de senha cair em outra página (ex.: a inicial),
  // o Supabase avisa com o evento PASSWORD_RECOVERY e levamos direto para a
  // tela de nova senha.
  supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/reset-password") {
      router.navigate("/reset-password");
    }
  });

  createRoot(document.getElementById("root")!).render(<App />);
  