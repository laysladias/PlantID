
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { registerNotificationServiceWorker } from "./app/lib/notifications";

  registerNotificationServiceWorker();

  createRoot(document.getElementById("root")!).render(<App />);
  