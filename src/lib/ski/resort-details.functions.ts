import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

function gatewayHeaders() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !mapsKey) return null;
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": mapsKey,
    "Content-Type": "application/json",
  };
}

export interface WeatherNow {
  temperatureC: number | null;
  condition: string;
  iconUrl: string | null;
  snowDepthMm: number | null;
  freezingLevelM: number | null;
}

export interface WeatherDay {
  date: string;
  minC: number | null;
  maxC: number | null;
  condition: string;
  iconUrl: string | null;
  snowMm: number | null;
}

const coordsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Meteo attuale + previsioni 3 giorni via Google Weather (connector gateway). */
export const resortWeather = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => coordsSchema.parse(data))
  .handler(async ({ data }) => {
    const headers = gatewayHeaders();
    const empty = {
      now: null as WeatherNow | null,
      forecast: [] as WeatherDay[],
      error: null as string | null,
    };
    if (!headers) return { ...empty, error: "Servizio meteo non configurato." };

    const q = `location.latitude=${data.lat}&location.longitude=${data.lng}&languageCode=it&unitsSystem=METRIC`;

    const [currentRes, forecastRes] = await Promise.all([
      fetch(`${GATEWAY_URL}/weather/v1/currentConditions:lookup?${q}`, { headers }),
      fetch(`${GATEWAY_URL}/weather/v1/forecast/days:lookup?${q}&days=3`, { headers }),
    ]);

    if (!currentRes.ok && !forecastRes.ok) {
      const body = await currentRes.text();
      console.error(`Google Weather ${currentRes.status}: ${body}`);
      return { ...empty, error: `Meteo non disponibile (${currentRes.status}).` };
    }

    let now: WeatherNow | null = null;
    if (currentRes.ok) {
      const j = (await currentRes.json()) as {
        temperature?: { degrees?: number };
        weatherCondition?: { description?: { text?: string }; iconBaseUri?: string };
        precipitation?: { snowQpf?: { quantity?: number } };
      };
      now = {
        temperatureC: typeof j.temperature?.degrees === "number" ? j.temperature.degrees : null,
        condition: j.weatherCondition?.description?.text ?? "—",
        iconUrl: j.weatherCondition?.iconBaseUri
          ? `${j.weatherCondition.iconBaseUri}.svg`
          : null,
        snowDepthMm:
          typeof j.precipitation?.snowQpf?.quantity === "number"
            ? j.precipitation.snowQpf.quantity
            : null,
        freezingLevelM: null,
      };
    }

    const forecast: WeatherDay[] = [];
    if (forecastRes.ok) {
      const j = (await forecastRes.json()) as {
        forecastDays?: Array<{
          interval?: { startTime?: string };
          displayDate?: { year: number; month: number; day: number };
          maxTemperature?: { degrees?: number };
          minTemperature?: { degrees?: number };
          daytimeForecast?: {
            weatherCondition?: { description?: { text?: string }; iconBaseUri?: string };
            precipitation?: { snowQpf?: { quantity?: number } };
          };
        }>;
      };
      for (const d of j.forecastDays ?? []) {
        const dd = d.displayDate;
        forecast.push({
          date: dd
            ? `${dd.year}-${String(dd.month).padStart(2, "0")}-${String(dd.day).padStart(2, "0")}`
            : (d.interval?.startTime ?? "").slice(0, 10),
          minC: typeof d.minTemperature?.degrees === "number" ? d.minTemperature.degrees : null,
          maxC: typeof d.maxTemperature?.degrees === "number" ? d.maxTemperature.degrees : null,
          condition: d.daytimeForecast?.weatherCondition?.description?.text ?? "—",
          iconUrl: d.daytimeForecast?.weatherCondition?.iconBaseUri
            ? `${d.daytimeForecast.weatherCondition.iconBaseUri}.svg`
            : null,
          snowMm:
            typeof d.daytimeForecast?.precipitation?.snowQpf?.quantity === "number"
              ? d.daytimeForecast.precipitation.snowQpf.quantity
              : null,
        });
      }
    }

    return { now, forecast, error: null as string | null };
  });

export interface Webcam {
  id: string;
  title: string;
  playerUrl: string;
  previewUrl: string | null;
}

/**
 * Webcam live vicine al comprensorio.
 * Con la chiave Windy usiamo l'API Webcams (player embeddato); senza chiave
 * mostriamo la mappa webcam di Windy incorporata (nessun link esterno rotto).
 */
export const resortWebcams = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => coordsSchema.parse(data))
  .handler(async ({ data }) => {
    const key = process.env["WINDY_WEBCAMS_API_KEY"];
    const mapEmbed = `https://embed.windy.com/embed2.html?lat=${data.lat}&lon=${data.lng}&zoom=11&level=surface&overlay=webcams&menu=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C`;

    if (!key) return { webcams: [] as Webcam[], mapEmbed, error: null as string | null };

    try {
      const res = await fetch(
        `https://api.windy.com/webcams/api/v3/webcams?nearby=${data.lat},${data.lng},30&limit=6&include=images,player&lang=it`,
        { headers: { "x-windy-api-key": key } },
      );
      if (!res.ok) {
        console.error(`Windy ${res.status}: ${await res.text()}`);
        return { webcams: [] as Webcam[], mapEmbed, error: null as string | null };
      }
      const json = (await res.json()) as {
        webcams?: Array<{
          webcamId: number;
          title?: string;
          player?: { live?: { embed?: string }; day?: { embed?: string } };
          images?: { current?: { preview?: string } };
        }>;
      };
      const webcams: Webcam[] = (json.webcams ?? [])
        .map((w) => ({
          id: String(w.webcamId),
          title: w.title ?? "Webcam",
          playerUrl:
            w.player?.live?.embed ??
            w.player?.day?.embed ??
            `https://webcams.windy.com/webcams/public/embed/player/${w.webcamId}/live`,
          previewUrl: w.images?.current?.preview ?? null,
        }))
        .filter((w) => Boolean(w.playerUrl));
      return { webcams, mapEmbed, error: null as string | null };
    } catch (err) {
      console.error("Windy webcams error", err);
      return { webcams: [] as Webcam[], mapEmbed, error: null as string | null };
    }
  });
