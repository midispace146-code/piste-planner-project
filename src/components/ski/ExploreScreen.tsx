import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, MapPin, Mountain, Route as RouteIcon, Search, Snowflake } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NewsList, type NewsItem } from "@/components/ski/NewsList";
import { ResortStatusPanel } from "@/components/ski/ResortStatusPanel";
import { CATALOG_REGIONS, RESORT_CATALOG, searchCatalog } from "@/lib/ski/catalog";
import { fetchSkiNews } from "@/lib/ski/news.functions";
import resortsData from "@/data/resorts.json";
import newsData from "@/data/news.json";
import type { Resort } from "@/lib/ski/types";

/** Dati editoriali extra disponibili solo per i comprensori curati. */
type CuratedExtra = {
  id: string;
  open_slopes_count?: number;
  total_slopes_count?: number;
  opening_hours?: string;
  weather_status?: string;
  snow_report?: string;
  webcam_url?: string;
};

const extras = new Map<string, CuratedExtra>(
  (resortsData as unknown as CuratedExtra[]).map((r) => [r.id, r]),
);
const fallbackNews = newsData as NewsItem[];

const SNOW_FILTERS = ["Tutte", "Neve fresca", "Neve compatta", "Polvere"] as const;

const INITIAL_DESTINATIONS = 5;
const DESTINATIONS_STEP = 10;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Esplora la neve — SkiScore" },
      {
        name: "description",
        content:
          "Cerca fra tutti i comprensori sciistici italiani, controlla impianti, meteo, bollettino neve e webcam live, e leggi le ultime notizie della montagna.",
      },
      { property: "og:title", content: "Esplora la neve — SkiScore" },
      {
        property: "og:description",
        content:
          "Stato piste, orari impianti, meteo e webcam dei comprensori italiani, più le notizie dalle fonti ufficiali.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExplorePage,
});

export function ExploreScreen() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Resort | null>(null);
  const [region, setRegion] = useState("Tutte");
  const [minKm, setMinKm] = useState(0);
  const [snow, setSnow] = useState<string>("Tutte");
  const [visible, setVisible] = useState(INITIAL_DESTINATIONS);

  const regions = useMemo(() => ["Tutte", ...CATALOG_REGIONS], []);

  // Ricerca sull'intero dataset impianti-italia.json (nome, regione, impianti).
  const suggestions = useMemo(() => searchCatalog(query, 20), [query]);

  const filtered = useMemo(
    () =>
      RESORT_CATALOG.filter((r) => {
        if (region !== "Tutte" && r.region !== region) return false;
        if (r.total_ski_km < minKm) return false;
        if (snow !== "Tutte") {
          const report = extras.get(r.id)?.snow_report ?? "";
          if (!report.toLowerCase().includes(snow.toLowerCase())) return false;
        }
        return true;
      }),
    [region, minKm, snow],
  );

  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  const resetPagination = () => setVisible(INITIAL_DESTINATIONS);

  return (
    <main className="min-h-screen bg-background">
      {/* Header con ricerca */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-5 py-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="flex min-w-0 items-center gap-2 text-primary">
              <Snowflake className="h-5 w-5 shrink-0" />
              <span className="truncate font-display text-lg font-semibold text-foreground">
                Esplora la neve
              </span>
            </div>
            <Button asChild size="sm" variant="secondary">
              <Link to="/itinerario">Crea itinerario</Link>
            </Button>
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca comprensorio, regione o impianto: Cervinia, Plan de Corones…"
              className="pl-9"
              aria-label="Cerca comprensorio"
            />
            {suggestions.length > 0 && (
              <ul className="absolute inset-x-0 top-full z-40 mt-2 max-h-80 overflow-auto rounded-xl border border-border bg-popover shadow-lg">
                {suggestions.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(r);
                        setQuery("");
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-accent"
                    >
                      <MapPin className="h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{r.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {r.region} · {r.total_lifts} impianti
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </header>

      <ResortQuickView resort={selected} onClose={() => setSelected(null)} />

      {/* News */}
      <section className="mx-auto max-w-5xl px-5 py-8">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Ultime notizie della montagna
        </h1>
        <div className="mt-4">
          <NewsList news={news} />
        </div>
      </section>

      {/* Destinazioni */}
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Esplora luoghi e destinazioni
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {filtered.length} comprensori disponibili nel database impianti.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <select
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              resetPagination();
            }}
            aria-label="Filtra per regione"
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={minKm}
            onChange={(e) => {
              setMinKm(Number(e.target.value));
              resetPagination();
            }}
            aria-label="Filtra per chilometri di piste"
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            {[0, 20, 50, 100, 200].map((km) => (
              <option key={km} value={km}>
                {km === 0 ? "Tutti i km" : `Da ${km} km di piste`}
              </option>
            ))}
          </select>
          <select
            value={snow}
            onChange={(e) => {
              setSnow(e.target.value);
              resetPagination();
            }}
            aria-label="Filtra per condizioni neve"
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            {SNOW_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === "Tutte" ? "Tutte le condizioni" : s}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((r) => {
            const extra = extras.get(r.id);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelected(r)}
                className="rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Mountain className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate font-semibold text-foreground">{r.name}</span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{r.region}</p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <dt>Impianti</dt>
                    <dd className="font-semibold text-foreground">
                      {extra?.open_slopes_count !== undefined && extra.total_slopes_count !== undefined
                        ? `${extra.open_slopes_count}/${extra.total_slopes_count} piste`
                        : `${r.total_lifts}`}
                    </dd>
                  </div>
                  <div>
                    <dt>Km piste</dt>
                    <dd className="font-semibold text-foreground">
                      {r.total_ski_km > 0 ? `${r.total_ski_km} km` : "n.d."}
                    </dd>
                  </div>
                  <div>
                    <dt>Quota</dt>
                    <dd className="font-semibold text-foreground">{r.altitude} m</dd>
                  </div>
                  <div>
                    <dt>Neve</dt>
                    <dd className="font-semibold text-foreground">
                      {extra?.snow_report ?? `${r.snowmaking_coverage}% innevamento`}
                    </dd>
                  </div>
                </dl>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nessun comprensorio con questi filtri.
            </p>
          )}
        </div>

        {hasMore && (
          <div className="mt-6 flex justify-center">
            <Button
              variant="secondary"
              onClick={() => setVisible((v) => v + DESTINATIONS_STEP)}
            >
              Altro
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}

function ResortQuickView({
  resort,
  onClose,
}: {
  resort: Resort | null;
  onClose: () => void;
}) {
  const extra = resort ? extras.get(resort.id) : undefined;

  return (
    <Dialog open={Boolean(resort)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        {resort && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">{resort.name}</DialogTitle>
              <DialogDescription>
                {resort.region} · {resort.altitude} m
              </DialogDescription>
            </DialogHeader>

            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <Mountain className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-foreground">
                  {extra?.open_slopes_count !== undefined && extra.total_slopes_count !== undefined
                    ? `Piste aperte: ${extra.open_slopes_count}/${extra.total_slopes_count} · `
                    : ""}
                  {resort.total_ski_km > 0 ? `${resort.total_ski_km} km di piste` : "km piste n.d."}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <RouteIcon className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-foreground">
                  {resort.total_lifts} impianti · {resort.modern_lifts_percentage}% veloci ·{" "}
                  {resort.vertical_drop} m di dislivello
                </span>
              </li>
              {extra?.opening_hours && (
                <li className="flex items-center gap-3">
                  <Clock className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-foreground">Impianti: {extra.opening_hours}</span>
                </li>
              )}
              {(extra?.weather_status || extra?.snow_report) && (
                <li className="flex items-center gap-3">
                  <CloudSun className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-foreground">
                    {[extra.weather_status, extra.snow_report].filter(Boolean).join(" · ")}
                  </span>
                </li>
              )}
              <li className="flex items-center gap-3">
                <Video className="h-4 w-4 shrink-0 text-primary" />
                <a
                  href={
                    extra?.webcam_url ??
                    `https://www.google.com/maps/search/?api=1&query=${resort.lat},${resort.lng}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  {extra?.webcam_url ? "Guarda le webcam live" : "Apri la località su Google Maps"}
                </a>
              </li>
            </ul>

            <Button asChild className="mt-4 w-full">
              <Link to="/itinerario">Pianifica la sciata qui</Link>
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
