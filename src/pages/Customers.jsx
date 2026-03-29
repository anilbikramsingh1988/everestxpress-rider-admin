import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, Eye, CheckCircle, XCircle } from "lucide-react";
import { api } from "../api/client";

export default function Customers() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState(null);

  const page = parseInt(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const [searchInput, setSearchInput] = useState(search);

  const fetchCustomers = useCallback(() => {
    setLoading(true);
    setError("");
    const params = { page, limit: 20 };
    if (search) params.search = search;

    api
      .get("/customers", { params })
      .then((res) => {
        setCustomers(res.data.customers || []);
        setTotal(res.data.total || 0);
        setPages(res.data.pages || 1);
      })
      .catch((err) => setError(err?.response?.data?.error || "Failed to load customers"))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  function handleSearch(e) {
    e.preventDefault();
    const p = new URLSearchParams(searchParams);
    if (searchInput) p.set("search", searchInput);
    else p.delete("search");
    p.delete("page");
    setSearchParams(p);
  }

  function goPage(n) {
    const p = new URLSearchParams(searchParams);
    p.set("page", String(n));
    setSearchParams(p);
  }

  async function handleToggle(customerId) {
    setTogglingId(customerId);
    try {
      const res = await api.patch(`/customers/${customerId}/toggle`);
      setCustomers((prev) =>
        prev.map((c) => c._id === customerId ? { ...c, isActive: res.data.isActive } : c)
      );
    } catch {
      // silently fail
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Customers</h1>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
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
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">No customers found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Name", "Phone", "Phone Verified", "Active", "Wallet Balance", "Joined", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.fullName}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                  <td className="px-4 py-3">
                    {c.isPhoneVerified
                      ? <CheckCircle size={16} className="text-green-500" />
                      : <XCircle size={16} className="text-gray-300" />}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(c._id)}
                      disabled={togglingId === c._id}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        c.isActive ? "bg-green-500" : "bg-gray-300"
                      } disabled:opacity-60`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          c.isActive ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-700">NPR {(c.walletBalance || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/customers/${c._id}`)}
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
