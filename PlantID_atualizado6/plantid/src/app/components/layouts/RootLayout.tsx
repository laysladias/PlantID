import { Outlet, useNavigate, useLocation } from "react-router";
import { Home, Search, Lightbulb, Cloud, Leaf, Bell, User } from "lucide-react";
import { useEffect } from "react";

export function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is authenticated
  useEffect(() => {
    const storedUser = localStorage.getItem("plantid_user");
    if (!storedUser) {
      navigate("/login");
    }
  }, [navigate]);

  const navItems = [
    { icon: Home, label: "Início", path: "/" },
    { icon: Search, label: "Buscar", path: "/search" },
    { icon: Lightbulb, label: "Luz", path: "/light-meter" },
    { icon: Cloud, label: "Clima", path: "/weather" },
    { icon: Leaf, label: "Plantas", path: "/my-plants" },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 to-green-500 text-white p-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="w-8 h-8" />
            <h1 className="text-2xl font-bold">PlantID</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/reminders")}
              className="p-2 hover:bg-white/20 rounded-full transition-colors relative"
            >
              <Bell className="w-6 h-6" />
            </button>
            <button
              onClick={() => navigate("/profile")}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <User className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center p-3 flex-1 transition-colors ${
                  isActive
                    ? "text-green-600"
                    : "text-gray-600 hover:text-green-500"
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
