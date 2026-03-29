import React, { useEffect, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { io } from "socket.io-client";
import { api } from "../api/client";
import { RefreshCw, Wifi, WifiOff, MapPin, Bike } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Fix default leaflet marker icons (broken with bundlers)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom online rider icon (red)
const onlineIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Custom offline icon (grey)
const offlineIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Nepal center coordinates
const NEPAL_CENTER = [28.3949, 84.124];

function timeAgo(date) {
  if (!date) return "Unknown";
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

function FitBounds({ riders }) {
  const map = useMap();
  useEffect(() => {
    if (riders.length === 0) return;
    const bounds = riders
      .filter(r => r.currentLocation?.lat && r.currentLocation?.lng)
      .map(r => [r.currentLocation.lat, r.currentLocation.lng]);
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, []);
  return null;
}

export default function LiveMap() {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const socketRef = useRef(null);

  const loadRiders = useCallback(async () => {
    try {
      const res = await api.get("/live-locations");
      setRiders(res.data.riders || []);
      setLastRefresh(new Date());
    } catch (e) {
      console.error("[live-map] fetch error", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadRiders();
  }, [loadRiders]);

  // Connect to socket for real-time updates
  useEffect(() => {
    const BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001";
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    const socket = io(BASE, {
      auth: { token, userType: "admin" },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join_admin_map");
    });

    socket.on("disconnect", () => setConnected(false));

    // Real-time location update from a rider
    socket.on("rider_location", ({ riderId, lat, lng, updatedAt }) => {
      setRiders(prev => {
        const idx = prev.findIndex(r => String(r._id) === String(riderId));
        if (idx === -1) {
          // New rider appeared — reload full list to get their name/info
          loadRiders();
          return prev;
        }
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          isOnline: true,
          currentLocation: { lat, lng, updatedAt },
        };
        return updated;
      });
    });

    // Rider went offline
    socket.on("rider_offline", ({ riderId }) => {
      setRiders(prev => prev.map(r =>
        String(r._id) === String(riderId) ? { ...r, isOnline: false } : r
      ));
    });

    return () => socket.disconnect();
  }, [loadRiders]);

  const onlineRiders = riders.filter(r => r.isOnline);
  const offlineRiders = riders.filter(r => !r.isOnline);

  return (
    <div className="flex flex-col h-full" style={{ height: "calc(100vh - 48px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Map</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {onlineRiders.length} online · {offlineRiders.length} recently seen
            {lastRefresh && <span className="ml-2 text-gray-400">· refreshed {timeAgo(lastRefresh)}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${connected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            {connected ? "Live" : "Disconnected"}
          </div>
          <button
            onClick={loadRiders}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-white"
            style={{ backgroundColor: "#DD0303" }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
          {riders.length === 0 && !loading && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 text-sm">
              <MapPin size={32} className="mx-auto mb-2 text-gray-200" />
              No riders with recent location data.
              <br />Riders appear here when they go online.
            </div>
          )}
          {riders.map(r => (
            <div key={String(r._id)} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${r.isOnline ? "bg-green-500" : "bg-gray-300"}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{r.fullName}</p>
                    <p className="text-xs text-gray-400">{r.phone}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Bike size={11} /> {r.vehicleType}
                </span>
              </div>
              {r.currentLocation?.updatedAt && (
                <p className="text-xs text-gray-400 mt-2 ml-4">
                  {timeAgo(r.currentLocation.updatedAt)}
                  {r.currentLocation.lat && (
                    <span className="ml-1 font-mono">
                      · {r.currentLocation.lat.toFixed(4)}, {r.currentLocation.lng.toFixed(4)}
                    </span>
                  )}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Map */}
        <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm bg-gray-50">
              Loading map...
            </div>
          ) : (
            <MapContainer
              center={NEPAL_CENTER}
              zoom={7}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {riders.length > 0 && <FitBounds riders={riders} />}
              {riders.map(r => {
                const { lat, lng } = r.currentLocation || {};
                if (!lat || !lng) return null;
                return (
                  <Marker
                    key={String(r._id)}
                    position={[lat, lng]}
                    icon={r.isOnline ? onlineIcon : offlineIcon}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold text-gray-900">{r.fullName}</p>
                        <p className="text-gray-500">{r.phone}</p>
                        <p className="text-gray-500 capitalize">{r.vehicleType}</p>
                        <p className={`font-semibold mt-1 ${r.isOnline ? "text-green-600" : "text-gray-400"}`}>
                          {r.isOnline ? "● Online" : "○ Offline"}
                        </p>
                        <p className="text-gray-400 text-xs mt-0.5">{timeAgo(r.currentLocation?.updatedAt)}</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  );
}
