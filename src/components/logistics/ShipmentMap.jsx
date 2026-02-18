import React, { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import StatusBadge from "@/components/ui/StatusBadge";

// Fix default marker icons for leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// City coordinates lookup (common European logistics destinations)
const CITY_COORDS = {
  // Hungary
  "Budapest": [47.4979, 19.0402],
  "Debrecen": [47.5316, 21.6273],
  "Miskolc": [48.1035, 20.7784],
  "Győr": [47.6875, 17.6504],
  "Pécs": [46.0727, 18.2323],
  "Székesfehérvár": [47.1899, 18.4097],
  // Slovakia
  "Bratislava": [48.1486, 17.1077],
  "Košice": [48.7164, 21.2611],
  // Romania
  "Bucharest": [44.4268, 26.1025],
  "Cluj-Napoca": [46.7712, 23.6236],
  "Timișoara": [45.7489, 21.2087],
  // Austria
  "Vienna": [48.2082, 16.3738],
  "Graz": [47.0707, 15.4395],
  // Germany
  "Munich": [48.1351, 11.5820],
  "Berlin": [52.5200, 13.4050],
  "Hamburg": [53.5753, 10.0153],
  "Frankfurt": [50.1109, 8.6821],
  "Stuttgart": [48.7758, 9.1829],
  // Poland
  "Warsaw": [52.2297, 21.0122],
  "Kraków": [50.0647, 19.9450],
  // Czech Republic
  "Prague": [50.0755, 14.4378],
  "Brno": [49.1951, 16.6068],
  // Serbia
  "Belgrade": [44.7866, 20.4489],
  // Croatia
  "Zagreb": [45.8150, 15.9819],
  // Italy
  "Rome": [41.9028, 12.4964],
  "Milan": [45.4654, 9.1859],
};

const LOADING_COORD = [47.5, 18.5]; // Default Hungary loading point

function getColor(status) {
  const map = {
    scheduled: "#3b82f6",
    loaded: "#f97316",
    in_transit: "#8b5cf6",
    customs: "#f59e0b",
    closed: "#10b981",
    cancelled: "#ef4444",
  };
  return map[status] || "#94a3b8";
}

function createTruckIcon(status) {
  const color = getColor(status);
  return L.divIcon({
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    </div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function createLoadingIcon() {
  return L.divIcon({
    html: `<div style="background:#1a1f2e;width:22px;height:22px;border-radius:4px;border:2px solid #e05a2b;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#e05a2b" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
    </div>`,
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -13],
  });
}

function estimateArrival(truck) {
  if (!truck.expected_loading_date) return "N/A";
  const loading = new Date(truck.expected_loading_date);
  const daysInTransit = truck.status === "in_transit" ? 2 : truck.status === "customs" ? 1 : 3;
  const eta = new Date(loading);
  eta.setDate(eta.getDate() + daysInTransit);
  return eta.toLocaleDateString("hu-HU");
}

export default function ShipmentMap({ trucks }) {
  const activeTrucks = useMemo(
    () => trucks.filter((t) => !["cancelled"].includes(t.status)),
    [trucks]
  );

  const truckPoints = useMemo(() =>
    activeTrucks.map((truck) => {
      const city = truck.destination_city;
      const country = truck.destination_country;
      const destCoord =
        CITY_COORDS[city] ||
        CITY_COORDS[country] ||
        null;

      const loadCoord =
        truck.loading_location_name
          ? CITY_COORDS[truck.loading_location_name] || LOADING_COORD
          : LOADING_COORD;

      return { truck, destCoord, loadCoord };
    }).filter((p) => p.destCoord),
    [activeTrucks]
  );

  const statusCounts = useMemo(() => {
    const counts = {};
    activeTrucks.forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return counts;
  }, [activeTrucks]);

  return (
    <div className="rounded-xl overflow-hidden border shadow-sm" style={{ borderColor: "#d0d4db" }}>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-4 py-3 border-b text-xs font-medium" style={{ background: "#e4e7ec", borderColor: "#d0d4db" }}>
        <span className="text-slate-600 font-semibold mr-1">Active shipments:</span>
        {Object.entries(statusCounts).map(([status, count]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: getColor(status) }} />
            <span className="capitalize text-slate-700">{status.replace("_", " ")} ({count})</span>
          </span>
        ))}
        {truckPoints.length === 0 && <span className="text-slate-400">No active trucks with known destinations</span>}
      </div>

      {/* Map */}
      <div style={{ height: 480 }}>
        <MapContainer
          center={[48.0, 18.0]}
          zoom={5}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Routes + destination markers */}
          {truckPoints.map(({ truck, destCoord, loadCoord }) => (
            <React.Fragment key={truck.id}>
              <Polyline
                positions={[loadCoord, destCoord]}
                pathOptions={{
                  color: getColor(truck.status),
                  weight: 2.5,
                  opacity: 0.7,
                  dashArray: truck.status === "scheduled" ? "6 4" : undefined,
                }}
              />
              <Marker position={destCoord} icon={createTruckIcon(truck.status)}>
                <Popup>
                  <div className="text-sm space-y-1 min-w-[180px]">
                    <div className="font-bold text-slate-800">{truck.truck_number || `T-${truck.id?.slice(0, 6)}`}</div>
                    <div className="text-slate-600">{truck.product_name || "—"}</div>
                    <div className="text-slate-500">{truck.destination_city}, {truck.destination_country}</div>
                    <div className="text-slate-500">Carrier: {truck.carrier_name || "—"}</div>
                    <div className="text-slate-500">Weight: {truck.actual_weight_tons || truck.planned_quantity_tons || "—"} t</div>
                    <div className="text-slate-500">ETA: <span className="font-medium text-slate-700">{estimateArrival(truck)}</span></div>
                    <div className="pt-1">
                      <StatusBadge status={truck.status} />
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}

          {/* Loading point marker */}
          {truckPoints.length > 0 && (
            <Marker position={LOADING_COORD} icon={createLoadingIcon()}>
              <Popup>
                <div className="text-sm font-semibold text-slate-800">Loading Hub (HU)</div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}