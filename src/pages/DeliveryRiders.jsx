import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, Eye, MapPin } from "lucide-react";
import { api } from "../api/client";

const KYC_BADGE = {
  pending:   "bg-gray-100 text-gray-600",
  submitted: "bg-yellow-100 text-yellow-700",
  verified:  "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-700",
};

const KYC_OPTIONS = [
  { value: "",          label: "All KYC Statuses" },
  { value: "pending",   label: "Pending" },
  { value: "submitted", label: "Submitted (needs review)" },
  { value: "verified",  label: "Verified" },
  { value: "rejected",  label: "Rejected" },
];

export default function DeliveryRiders() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [riders, setRiders]     = useState([]);
  const [liveMap, setLiveMap]   = useState({}); // riderId -> { isOnline, lat, lng }
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [togglingId, setTogglingId] = useState(null);

  const page      = parseInt(searchParams.get("page") || "1");
  const search    = searchParams.get("search") || "";
  const kycStatus = searchParams.get("kycStatus") || "";
  const [searchInput, setSearchInput] = useState(search);

  const fetchRiders = useCallback(() => {
    setLoading(true);
    setError("");
    const params = { page, limit: 20 };
    if (search)    params.search    = search;
    if (kycStatus) params.kycStatus = kycStatus;

    Promise.all([
      api.get("/delivery-riders", { params }),
      api.get("/live-locations"),
    ])
      .then(([ridersRes, liveRes]) => {
        setRiders(ridersRes.data.riders || []);
        setTotal(ridersRes.data.total || 0);
        setPages(ridersRes.data.pages || 1);

        // Build lookup map by rider ID
        const map = {};
        for (const r of liveRes.data.riders || []) {
          map[String(r._id)] = {
            isOnline: r.isOnline,
            lat: r.currentLocation?.lat,
            lng: r.currentLocation?.lng,
            updatedAt: r.currentLocation?.updatedAt,
          };
        }
        setLiveMap(map);
      })
      .catch((err) => setError(err?.response?.data?.error || "Failed to load riders"))
      .finally(() => setLoading(false));
  }, [page, search, kycStatus]);

  useEffect(() => { fetchRiders(); }, [fetchRiders]);

  // Refresh live status every 30s
  useEffect(() => {
    const id = setInterval(() => {
      api.get("/live-locations").then((res) => {
        const map = {};
        for (const r of res.data.riders || []) {
          map[String(r._id)] = {
            isOnline: r.isOnline,
            lat: r.currentLocation?.lat,
            lng: r.currentLocation?.lng,
            updatedAt: r.currentLocation?.updatedAt,
          };
        }
        setLiveMap(map);
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, []);

  function setParam(key, value) {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    p.delete("page");
    setSearchParams(p);
  }

  function handleSearch(e) {
    e.preventDefault();
    setParam("search", searchInput);
  }

  function goPage(n) {
    const p = new URLSearchParams(searchParams);
    p.set("page", String(n));
    setSearchParams(p);
  }

  async function handleToggle(riderId) {
    setTogglingId(riderId);
    try {
      const res = await api.patch(`/delivery-riders/${riderId}/toggle`);
      setRiders((prev) =>
        prev.map((r) => r._id === riderId ? { ...r, isActive: res.data.isActive } : r)
      );
    } catch {} finally {
      setTogglingId(null);
    }
  }

  function openOnMap(e, riderId) {
    e.stopPropagation();
    navigate(`/live-map?highlight=${riderId}`);
  }

  const onlineCount = Object.values(liveMap).filter(v => v.isOnline).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Delivery Riders</h1>
        {onlineCount > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {onlineCount} online now
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <select
          value={kycStatus}
          onChange={(e) => setParam("kycStatus", e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD0303]"
        >
          {KYC_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-xs">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name or phone..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#DD0303]"
            />
          </div>
          <button type="submit" className="bg-[#DD0303] hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm">
            Search
          </button>
        </form>

        <p className="ml-auto text-sm text-gray-500 self-center">{total} total</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : riders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">No delivery riders found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Name", "Phone", "Vehicle", "KYC", "Status", "Active", "Rating", "Stats", "Joined", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {riders.map((r) => {
                const kycSt    = r.kyc?.status || "pending";
                const avgRating = r.stats?.averageRating;
                const live     = liveMap[String(r._id)];
                const isOnline = live?.isOnline;
                const hasLoc   = live?.lat != null && live?.lng != null;

                return (
                  <tr key={r._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/delivery-riders/${r._id}`)}>
                    <td className="px-4 py-3 font-medium text-gray-800">{r.fullName}</td>
                    <td className="px-4 py-3 text-gray-600">{r.phone}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{r.vehicleType || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${KYC_BADGE[kycSt] || "bg-gray-100 text-gray-600"}`}>
                        {kycSt}
                      </span>
                    </td>

                    {/* Live status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${isOnline ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
                        {isOnline ? "Online" : "Offline"}
                      </span>
                    </td>

                    {/* Active toggle */}
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggle(r._id); }}
                        disabled={togglingId === r._id}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${r.isActive ? "bg-green-500" : "bg-gray-300"} disabled:opacity-60`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${r.isActive ? "translate-x-4" : "translate-x-1"}`} />
                      </button>
                    </td>

                    <td className="px-4 py-3 text-gray-700">
                      {avgRating != null ? `${avgRating.toFixed(1)} ★` : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {r.stats?.accepted || 0}A / {r.stats?.delivered || 0}D / {r.stats?.failed || 0}F
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/delivery-riders/${r._id}`); }}
                          className="flex items-center gap-1 text-xs text-[#DD0303] hover:text-red-700 font-medium"
                        >
                          <Eye size={14} /> View
                        </button>
                        {hasLoc && (
                          <button
                            onClick={(e) => openOnMap(e, r._id)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <MapPin size={14} /> Map
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button onClick={() => goPage(page - 1)} disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
            <ChevronLeft size={16} /> Prev
          </button>
          <span className="text-sm text-gray-600">Page {page} of {pages}</span>
          <button onClick={() => goPage(page + 1)} disabled={page >= pages}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
