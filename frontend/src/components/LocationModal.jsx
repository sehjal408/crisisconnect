import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { X, Navigation, MapPin } from "lucide-react";
import { Button, Spinner } from "./ui";

// In-app location viewer: shows the exact spot on a Leaflet map, with a
// "Get directions" button that hands off to Google Maps for turn-by-turn.
// If the request has no stored coordinates, it geocodes the address on open.

const pinIcon = L.divIcon({
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 29],
  popupAnchor: [0, -27],
  html: `<svg width="30" height="30" viewBox="0 0 24 24" fill="#e0574b" stroke="#fff" stroke-width="1.4">
    <path d="M12 21s-6-5.686-6-10a6 6 0 1 1 12 0c0 4.314-6 10-6 10z"/>
    <circle cx="12" cy="11" r="2.2" fill="#fff" stroke="none"/></svg>`,
});

export default function LocationModal({ open, onClose, latitude, longitude, address, title = "Location" }) {
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFailed(false);
    if (latitude != null && longitude != null) { setCoords([latitude, longitude]); return; }
    if (!address) { setCoords(null); return; }
    setLoading(true);
    setCoords(null);
    fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1&lang=en&lat=53.726&lon=-127.6476`)
      .then((r) => r.json())
      .then((d) => {
        const f = d.features && d.features[0];
        if (f) setCoords([f.geometry.coordinates[1], f.geometry.coordinates[0]]);
        else setFailed(true);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [open, latitude, longitude, address]);

  if (!open) return null;

  const directionsUrl = coords
    ? `https://www.google.com/maps/dir/?api=1&destination=${coords[0]},${coords[1]}`
    : address
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm animate-fade" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-rise rounded-[22px] bg-white p-6 shadow-pop">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[18px] font-bold text-ink">{title}</h3>
            {address && (
              <p className="mt-0.5 flex items-start gap-1 text-[13px] text-muted">
                <MapPin size={13} className="mt-0.5 shrink-0" /> {address}
              </p>
            )}
          </div>
          <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-line-soft">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-hidden rounded-[16px] hairline" style={{ height: 300 }}>
          {loading ? (
            <div className="grid h-full place-items-center"><Spinner label="Locating…" /></div>
          ) : coords ? (
            <MapContainer key={coords.join(",")} center={coords} zoom={14} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap &copy; CARTO" />
              <Marker position={coords} icon={pinIcon}>{address && <Popup>{address}</Popup>}</Marker>
            </MapContainer>
          ) : (
            <div className="grid h-full place-items-center px-6 text-center text-[13px] text-muted">
              {failed ? "Couldn't pinpoint this address on the map." : "No location was provided for this request."}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button icon={Navigation} disabled={!directionsUrl} onClick={() => directionsUrl && window.open(directionsUrl, "_blank", "noopener")}>
            Get directions
          </Button>
        </div>
      </div>
    </div>
  );
}
