import React, { useEffect, useState, useCallback } from "react";
import { Plus, X, Tag } from "lucide-react";
import { api } from "../api/client";

const DISCOUNT_TYPES = [
  { value: "flat", label: "Flat (NPR)" },
  { value: "percent", label: "Percent (%)" },
];

const emptyForm = {
  code: "",
  discountType: "flat",
  discountValue: "",
  minFare: "",
  maxDiscount: "",
  maxUses: "",
  expiresAt: "",
};

export default function PromoCodes() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [togglingId, setTogglingId] = useState(null);

  const fetchPromos = useCallback(() => {
    setLoading(true);
    api
      .get("/promo")
      .then((res) => setPromos(res.data.promos || []))
      .catch((err) => setError(err?.response?.data?.error || "Failed to load promo codes"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === "code" ? value.toUpperCase() : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.code || !form.discountValue) {
      setFormError("Code and discount value are required.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      const payload = {
        code: form.code,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minFare: form.minFare ? Number(form.minFare) : 0,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt || null,
      };
      const res = await api.post("/promo", payload);
      setPromos((prev) => [res.data.promo, ...prev]);
      setShowModal(false);
      setForm(emptyForm);
    } catch (err) {
      setFormError(err?.response?.data?.error || "Failed to create promo code.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(promoId) {
    setTogglingId(promoId);
    try {
      const res = await api.patch(`/promo/${promoId}/toggle`);
      setPromos((prev) =>
        prev.map((p) => p._id === promoId ? { ...p, isActive: res.data.isActive } : p)
      );
    } catch {
      // silently fail
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Promo Codes</h1>
        <button
          onClick={() => { setShowModal(true); setFormError(""); setForm(emptyForm); }}
          className="flex items-center gap-2 bg-[#DD0303] hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> Create Promo Code
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : promos.length === 0 ? (
          <div className="p-12 text-center">
            <Tag size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No promo codes yet. Create your first one.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Code", "Type", "Value", "Min Fare", "Max Discount", "Uses / Max", "Active", "Expires", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {promos.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-bold text-gray-800 text-sm">{p.code}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.discountType === "percent" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                    }`}>
                      {p.discountType === "percent" ? "%" : "NPR"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    {p.discountType === "percent" ? `${p.discountValue}%` : `NPR ${p.discountValue}`}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.minFare ? `NPR ${p.minFare}` : "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.maxDiscount ? `NPR ${p.maxDiscount}` : "—"}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {p.uses || 0} / {p.maxUses ?? "∞"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(p._id)}
                      disabled={togglingId === p._id}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        p.isActive ? "bg-green-500" : "bg-gray-300"
                      } disabled:opacity-60`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${p.isActive ? "translate-x-4" : "translate-x-1"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : "No expiry"}
                  </td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">Create Promo Code</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Code *</label>
                <input
                  name="code"
                  value={form.code}
                  onChange={handleFormChange}
                  placeholder="e.g. SAVE50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#DD0303]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Discount Type *</label>
                  <select
                    name="discountType"
                    value={form.discountType}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#DD0303]"
                  >
                    {DISCOUNT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Value * {form.discountType === "percent" ? "(%)" : "(NPR)"}
                  </label>
                  <input
                    name="discountValue"
                    type="number"
                    min="0"
                    value={form.discountValue}
                    onChange={handleFormChange}
                    placeholder={form.discountType === "percent" ? "e.g. 10" : "e.g. 50"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#DD0303]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Min Fare (NPR)</label>
                  <input
                    name="minFare"
                    type="number"
                    min="0"
                    value={form.minFare}
                    onChange={handleFormChange}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#DD0303]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Max Discount (NPR)</label>
                  <input
                    name="maxDiscount"
                    type="number"
                    min="0"
                    value={form.maxDiscount}
                    onChange={handleFormChange}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#DD0303]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Max Uses</label>
                  <input
                    name="maxUses"
                    type="number"
                    min="1"
                    value={form.maxUses}
                    onChange={handleFormChange}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#DD0303]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Expires At</label>
                  <input
                    name="expiresAt"
                    type="date"
                    value={form.expiresAt}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#DD0303]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#DD0303] hover:bg-red-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
                >
                  {submitting ? "Creating..." : "Create Promo Code"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
