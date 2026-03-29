import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { api } from "../api/client";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "PICKED_UP", label: "Picked Up" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_BADGE = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  PICKED_UP: "bg-purple-100 text-purple-700",
  IN_TRANSIT: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  AWAITING_PAYMENT: "bg-orange-100 text-orange-700",
};

export default function Bookings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const page = parseInt(searchParams.get("page") || "1");
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";

  const [searchInput, setSearchInput] = useState(search);

  const fetchBookings = useCallback(() => {
    setLoading(true);
    setError("");
    const params = { page, limit: 20 };
    if (status) params.status = status;
    if (search) params.search = search;

    api
      .get("/bookings", { params })
      .then((res) => {
        setBookings(res.data.bookings || []);
        setTotal(res.data.total || 0);
        setPages(res.data.pages || 1);
      })
      .catch((err) => setError(err?.response?.data?.error || "Failed to load bookings"))
      .finally(() => setLoading(false));
  }, [page, status, search]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  function setParam(key, value) {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value);
    else p.delete(key);
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Bookings</h1>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <select
          value={status}
          onChange={(e) => setParam("status", e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD0303]"
        >
          {STATUS_OPTIONS.map((o) => (
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
              placeholder="Search tracking no..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#DD0303]"
            />
          </div>
          <button
            type="submit"
            className="bg-[#DD0303] hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
          >
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
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">No bookings found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Tracking No", "Customer", "Rider", "Pickup City", "Dropoff City", "Status", "Fare", "Date", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b) => (
                <tr
                  key={b._id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/bookings/${b._id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{b.trackingNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{b.riderId?.fullName || "—"}</p>
                    <p className="text-xs text-gray-400">{b.riderId?.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {b.assignedDriverName || <span className="text-gray-300">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.pickup?.city || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{b.dropoff?.city || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[b.status] || "bg-gray-100 text-gray-600"}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {b.estimatedFare != null ? `NPR ${b.estimatedFare}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(b.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/bookings/${b._id}`); }}
                      className="flex items-center gap-1 text-xs text-[#DD0303] hover:text-red-700 font-medium"
                    >
                      <Eye size={14} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => goPage(page - 1)}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <span className="text-sm text-gray-600">Page {page} of {pages}</span>
          <button
            onClick={() => goPage(page + 1)}
            disabled={page >= pages}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
