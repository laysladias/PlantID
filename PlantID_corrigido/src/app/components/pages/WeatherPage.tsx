import { useState, useEffect } from "react";
import { Cloud, Droplets, Wind, Sun, MapPin, Thermometer } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  location: string;
  feelsLike: number;
  uvIndex: number;
}

// Mapa dos códigos de clima WMO (usados pela Open-Meteo) para descrições em português
function weatherCodeToCondition(code: number): string {
  if (code === 0) return "Céu limpo";
  if (code === 1) return "Predominantemente limpo";
  if (code === 2) return "Parcialmente nublado";
  if (code === 3) return "Nublado";
  if (code === 45 || code === 48) return "Neblina";
  if (code >= 51 && code <= 57) return "Garoa";
  if (code >= 61 && code <= 67) return "Chuva";
  if (code >= 71 && code <= 77) return "Neve";
  if (code >= 80 && code <= 82) return "Pancadas de chuva";
  if (code >= 95) return "Tempestade";
  return "Condições variáveis";
}

async function getCoordinates(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalização não é suportada neste navegador."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

async function getLocationName(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
    );
    const data = await res.json();
    const address = data?.address ?? {};
    const city = address.city || address.town || address.village || address.county;
    const state = address.state_code || address.state;
    if (city && state) return `${city}, ${state}`;
    if (city) return city;
    return "Localização atual";
  } catch {
    return "Localização atual";
  }
}

export function WeatherPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);

    try {
      const { lat, lon } = await getCoordinates();

      const [weatherRes, locationName] = await Promise.all([
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code` +
            `&daily=uv_index_max&timezone=auto`
        ).then((r) => r.json()),
        getLocationName(lat, lon),
      ]);

      const current = weatherRes.current;
      const uvToday = weatherRes.daily?.uv_index_max?.[0] ?? 0;

      const data: WeatherData = {
        temperature: Math.round(current.temperature_2m),
        humidity: Math.round(current.relative_humidity_2m),
        windSpeed: Math.round(current.wind_speed_10m),
        condition: weatherCodeToCondition(current.weather_code),
        location: locationName,
        feelsLike: Math.round(current.apparent_temperature),
        uvIndex: Math.round(uvToday),
      };

      setWeather(data);
    } catch (err: any) {
      if (err?.code === 1) {
        setError(
          "Permissão de localização negada. Habilite o acesso à localização para este site nas configurações do navegador e tente novamente."
        );
      } else if (err?.code === 2) {
        setError("Não foi possível determinar sua localização no momento. Verifique se o GPS/localização do dispositivo está ativado.");
      } else if (err?.code === 3) {
        setError("A busca pela localização demorou demais. Verifique sua conexão e tente novamente.");
      } else {
        setError(err?.message || "Não foi possível obter o clima agora. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  const getPlantRecommendation = (weather: WeatherData) => {
    if (weather.temperature > 25 && weather.humidity > 60) {
      return {
        title: "Ideal para plantas tropicais",
        message: "O clima está ótimo para Monstera, Samambaia e Jiboia!",
        color: "text-green-600",
        bgColor: "bg-green-50",
      };
    } else if (weather.temperature < 18) {
      return {
        title: "Temperatura baixa",
        message: "Mantenha plantas sensíveis ao frio em ambientes internos.",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
      };
    } else if (weather.humidity < 40) {
      return {
        title: "Umidade baixa",
        message: "Considere borrifar água nas folhas das plantas.",
        color: "text-orange-600",
        bgColor: "bg-orange-50",
      };
    } else {
      return {
        title: "Condições favoráveis",
        message: "Bom momento para arejar e cuidar das suas plantas!",
        color: "text-green-600",
        bgColor: "bg-green-50",
      };
    }
  };

  if (loading && !weather) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <Cloud className="w-16 h-16 text-gray-400 animate-pulse mx-auto" />
          <p className="text-gray-600 mt-4">Carregando clima...</p>
        </div>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className="p-4 space-y-4">
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
        <Button onClick={fetchWeather} className="w-full bg-green-600 hover:bg-green-700">
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!weather) return null;

  const recommendation = getPlantRecommendation(weather);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Clima Local</h2>
        <div className="flex items-center gap-2 text-gray-600 mt-1">
          <MapPin className="w-4 h-4" />
          <p>{weather.location}</p>
        </div>
      </div>

      {/* Main weather card */}
      <Card className="light-surface p-6 bg-gradient-to-br from-blue-50 to-sky-50">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-5xl font-bold text-gray-800">
              {weather.temperature}°C
            </div>
            <p className="text-gray-600 mt-2">{weather.condition}</p>
            <p className="text-sm text-gray-500 mt-1">
              Sensação: {weather.feelsLike}°C
            </p>
          </div>
          <div className="bg-white/50 p-6 rounded-full">
            <Cloud className="w-16 h-16 text-blue-600" />
          </div>
        </div>
      </Card>

      {/* Weather details */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Droplets className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Umidade</p>
              <p className="font-semibold text-gray-800">{weather.humidity}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 p-2 rounded-lg">
              <Wind className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Vento</p>
              <p className="font-semibold text-gray-800">{weather.windSpeed} km/h</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Sun className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Índice UV</p>
              <p className="font-semibold text-gray-800">{weather.uvIndex}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <Thermometer className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Sensação</p>
              <p className="font-semibold text-gray-800">{weather.feelsLike}°C</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Plant recommendation */}
      <Card className={`p-4 ${recommendation.bgColor}`}>
        <div className="flex gap-3">
          <Sun className={`w-6 h-6 ${recommendation.color} flex-shrink-0`} />
          <div>
            <h3 className={`font-semibold ${recommendation.color}`}>
              {recommendation.title}
            </h3>
            <p className="text-sm text-gray-700 mt-1">
              {recommendation.message}
            </p>
          </div>
        </div>
      </Card>

      {/* Care tips based on weather */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-800 mb-3">
          Dicas de Cuidados
        </h3>
        <div className="space-y-2 text-sm text-gray-600">
          {weather.temperature > 28 && (
            <div className="flex gap-2">
              <span>•</span>
              <span>Aumente a frequência de rega em dias quentes</span>
            </div>
          )}
          {weather.humidity < 50 && (
            <div className="flex gap-2">
              <span>•</span>
              <span>Borrife água nas folhas para aumentar a umidade</span>
            </div>
          )}
          {weather.uvIndex > 6 && (
            <div className="flex gap-2">
              <span>•</span>
              <span>Proteja plantas sensíveis do sol direto</span>
            </div>
          )}
          {weather.windSpeed > 15 && (
            <div className="flex gap-2">
              <span>•</span>
              <span>Proteja plantas em varandas de ventos fortes</span>
            </div>
          )}
        </div>
      </Card>

      <Button
        onClick={fetchWeather}
        variant="outline"
        className="w-full"
        disabled={loading}
      >
        {loading ? "Atualizando..." : "Atualizar Clima"}
      </Button>
    </div>
  );
}
