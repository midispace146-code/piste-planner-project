/** Costruzione dei link esterni di prenotazione con le date dell'itinerario. */

/** Booking.com con check-in/check-out già compilati. */
export function bookingUrl(
  name: string,
  address: string | null,
  startDate?: string,
  endDate?: string,
): string {
  const params = new URLSearchParams({
    ss: [name, address].filter(Boolean).join(" "),
    lang: "it",
    group_adults: "2",
    no_rooms: "1",
  });
  if (startDate && endDate) {
    params.set("checkin", startDate);
    params.set("checkout", endDate);
  }
  return `https://www.booking.com/searchresults.it.html?${params.toString()}`;
}

/** Scheda Google Maps del luogo (contatti, orari, prenotazione diretta). */
export function placeUrl(name: string, placeId?: string | null, address?: string | null): string {
  const query = encodeURIComponent([name, address].filter(Boolean).join(" "));
  return placeId
    ? `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${encodeURIComponent(placeId)}`
    : `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/** Link al noleggio: sito ufficiale se disponibile, altrimenti scheda Google. */
export function rentalUrl(
  name: string,
  websiteUri?: string | null,
  placeId?: string | null,
  address?: string | null,
  startDate?: string,
  endDate?: string,
): string {
  if (websiteUri) {
    try {
      const url = new URL(websiteUri);
      if (startDate && endDate) {
        url.searchParams.set("from", startDate);
        url.searchParams.set("to", endDate);
      }
      return url.toString();
    } catch {
      return websiteUri;
    }
  }
  return placeUrl(name, placeId, address);
}

const PRICE_RANGES: Record<string, { hotel: string; rental: string; label: string }> = {
  PRICE_LEVEL_INEXPENSIVE: { hotel: "60–90 €", rental: "20–28 €", label: "Economico" },
  PRICE_LEVEL_MODERATE: { hotel: "90–150 €", rental: "28–38 €", label: "Medio" },
  PRICE_LEVEL_EXPENSIVE: { hotel: "150–260 €", rental: "38–50 €", label: "Alto" },
  PRICE_LEVEL_VERY_EXPENSIVE: { hotel: "260 €+", rental: "50 €+", label: "Lusso" },
};

/** Prezzo indicativo derivato dalla fascia di prezzo dichiarata da Google. */
export function indicativePrice(
  priceLevel: string | null | undefined,
  kind: "hotel" | "rental",
): string | null {
  if (!priceLevel) return null;
  const range = PRICE_RANGES[priceLevel];
  if (!range) return null;
  return kind === "hotel" ? `${range.hotel} / notte` : `${range.rental} / giorno`;
}
