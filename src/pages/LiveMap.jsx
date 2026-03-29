import React, { useEffect, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { io } from "socket.io-client";
import { api } from "../api/client";
import { RefreshCw, Wifi, WifiOff, MapPin, Bike } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Fix default leaflet marker icons broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const onlineIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const offlineIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

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
    const bounds = riders
      .filter(r => r.currentLocation?.lat && r.currentLocation?.lng)
      .map(r => [r.currentLocation.lat, r.currentLocation.lng]);
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [riders.length]);
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
      console.error("[live-map]", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRiders(); }, [loadRiders]);

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

    socket.on("rider_location", ({ riderId, lat, lng, updatedAt }) => {
      setRiders(prev => {
        const idx = prev.findIndex(r => String(r._id) === String(riderId));
        if (idx === -1) { loadRiders(); return prev; }
        const updated = [...prev];
        updated[idx] = { ...updated[idx], isOnline: true, currentLocation: { lat, lng, updatedAt } };
        return updated;
      });
    });

    socket.on("rider_offline", ({ riderId }) => {
      setRiders(prev => prev.map(r =>
        String(r._id) === String(riderId) ? { ...r, isOnline: false } : r
      ));
    });

    return () => socket.disconnect();
  }, [loadRiders]);

  const onlineCount = riders.filter(r => r.isOnline).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 96px)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Map</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {onlineCount} online · {riders.length - onlineCount} recently seen
            {lastRefresh && <span className="ml-2 text-gray-400">· {timeAgo(lastRefresh)}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${connected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            {connected ? "Live" : "Disconnected"}
          </span>
          <button onClick={loadRiders} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-white" style={{ backgroundColor: "#DD0303" }}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <div style={{ width: 240, flexShrink: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {riders.length === 0 && !loading && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 text-sm">
              <MapPin size={32} className="mx-auto mb-2 text-gray-200" />
              No riders online yet.
            </div>
          )}
          {riders.map(r => (
            <div key={String(r._id)} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 ${r.isOnline ? "bg-green-500" : "bg-gray-300"}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{r.fullName}</p>
                    <p className="text-xs text-gray-400">{r.phone}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex items-center gap-1 capitalize">
                  <Bike size={11} /> {r.vehicleType}
                </span>
              </div>
              {r.currentLocation?.updatedAt && (
                <p className="text-xs text-gray-400 mt-2 pl-4">{timeAgo(r.currentLocation.updatedAt)}</p>
              )}
            </div>
          ))}
        </div>

        {/* Map */}
        <div style={{ flex: 1, borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
          <MapContainer
            center={NEPAL_CENTER}
            zoom={7}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
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
                <Marker key={String(r._id)} position={[lat, lng]} icon={r.isOnline ? onlineIcon : offlineIcon}>
                  <Popup>
                    <div style={{ fontSize: 13 }}>
                      <p style={{ fontWeight: 700, marginBottom: 2 }}>{r.fullName}</p>
                      <p style={{ color: "#6b7280" }}>{r.phone}</p>
                      <p style={{ color: "#6b7280", textTransform: "capitalize" }}>{r.vehicleType}</p>
                      <p style={{ fontWeight: 600, marginTop: 4, color: r.isOnline ? "#16a34a" : "#9ca3af" }}>
                        {r.isOnline ? "● Online" : "○ Offline"}
                      </p>
                      <p style={{ fontSize: 11, color: "#9ca3af" }}>{timeAgo(r.currentLocation?.updatedAt)}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
