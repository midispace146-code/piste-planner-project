import {
  BedDouble,
  CalendarRange,
  ExternalLink,
  MapPin,
  Mountain,
  Star,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ItineraryRowLike {
  id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  resort_name: string;
  resort_lat: number;
  resort_lng: number;
  hotel_name: string;
  hotel_rating: number | string | null;
  hotel_address: string | null;
  hotel_place_id: string;
  rental_name: string;
  rental_rating: number | string | null;
  rental_address: string | null;
  rental_place_id: string;
}

/** Link diretto alla scheda Google Maps del luogo (prenotazione/contatti). */
function placeLink(name: string, placeId: string, address: string | null): string {
  const query = encodeURIComponent([name, address].filter(Boolean).join(" "));
  return placeId
    ? `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${encodeURIComponent(placeId)}`
    : `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function bookingLink(name: string, address: string | null): string {
  const query = encodeURIComponent([name, address].filter(Boolean).join(" "));
  return `https://www.booking.com/searchresults.it.html?ss=${query}`;
}

const it = (iso: string) => new Date(iso).toLocaleDateString("it-IT");
const asNumber = (v: number | string | null) => (v === null ? null : Number(v));

export function ItineraryDetailDialog({
  itinerary,
  onClose,
}: {
  itinerary: ItineraryRowLike | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(itinerary)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-auto">
        {itinerary && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">{itinerary.resort_name}</DialogTitle>
              <DialogDescription>
                Dettagli del viaggio, struttura e noleggio selezionati.
              </DialogDescription>
            </DialogHeader>

            <section className="rounded-xl border border-border p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Mountain className="h-4 w-4 text-primary" /> Viaggio
              </h3>
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarRange className="h-3.5 w-3.5" />
                {it(itinerary.start_date)} – {it(itinerary.end_date)} · {itinerary.total_days}{" "}
                {itinerary.total_days === 1 ? "giorno" : "giorni"}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {itinerary.resort_lat.toFixed(4)}, {itinerary.resort_lng.toFixed(4)}
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${itinerary.resort_lat},${itinerary.resort_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Apri la località sulla mappa <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </section>

            <section className="mt-3 rounded-xl border border-border p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <BedDouble className="h-4 w-4 text-primary" /> Hotel selezionato
              </h3>
              <p className="mt-2 font-medium text-foreground">{itinerary.hotel_name}</p>
              {asNumber(itinerary.hotel_rating) !== null && (
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-current text-primary" />
                  {asNumber(itinerary.hotel_rating)!.toFixed(1)}
                </p>
              )}
              {itinerary.hotel_address && (
                <p className="mt-1 text-sm text-muted-foreground">{itinerary.hotel_address}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <a
                    href={bookingLink(itinerary.hotel_name, itinerary.hotel_address)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Prenota la struttura <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <a
                    href={placeLink(
                      itinerary.hotel_name,
                      itinerary.hotel_place_id,
                      itinerary.hotel_address,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Scheda e contatti
                  </a>
                </Button>
              </div>
            </section>

            <section className="mt-3 rounded-xl border border-border p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Store className="h-4 w-4 text-primary" /> Noleggio attrezzatura
              </h3>
              <p className="mt-2 font-medium text-foreground">{itinerary.rental_name}</p>
              {asNumber(itinerary.rental_rating) !== null && (
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-current text-primary" />
                  {asNumber(itinerary.rental_rating)!.toFixed(1)}
                </p>
              )}
              {itinerary.rental_address && (
                <p className="mt-1 text-sm text-muted-foreground">{itinerary.rental_address}</p>
              )}
              <Button asChild size="sm" className="mt-3">
                <a
                  href={placeLink(
                    itinerary.rental_name,
                    itinerary.rental_place_id,
                    itinerary.rental_address,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Prenota l'attrezzatura <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
            </section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
