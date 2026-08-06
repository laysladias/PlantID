import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/layouts/RootLayout";
import { LoginPage } from "./components/pages/LoginPage";
import { SignUpPage } from "./components/pages/SignUpPage";
import { ResetPasswordPage } from "./components/pages/ResetPasswordPage";
import { HomePage } from "./components/pages/HomePage";
import { SearchPage } from "./components/pages/SearchPage";
import { PlantDetailPage } from "./components/pages/PlantDetailPage";
import { LightMeterPage } from "./components/pages/LightMeterPage";
import { WeatherPage } from "./components/pages/WeatherPage";
import { MyPlantsPage } from "./components/pages/MyPlantsPage";
import { RemindersPage } from "./components/pages/RemindersPage";
import { ProfilePage } from "./components/pages/ProfilePage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: HomePage },
      { path: "search", Component: SearchPage },
      { path: "plant/:id", Component: PlantDetailPage },
      { path: "light-meter", Component: LightMeterPage },
      { path: "weather", Component: WeatherPage },
      { path: "my-plants", Component: MyPlantsPage },
      { path: "reminders", Component: RemindersPage },
      { path: "profile", Component: ProfilePage },
    ],
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/signup",
    Component: SignUpPage,
  },
  {
    path: "/reset-password",
    Component: ResetPasswordPage,
  },
]);
