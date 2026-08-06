import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "./components/ui/sonner";
import { AccessibilityProvider } from "./lib/accessibility";
import { AccessibilityButton } from "./components/AccessibilityButton";

export default function App() {
  return (
    <AccessibilityProvider>
      <RouterProvider router={router} />
      <AccessibilityButton />
      <Toaster />
    </AccessibilityProvider>
  );
}
