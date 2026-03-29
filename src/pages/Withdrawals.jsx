import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, Banknote, Phone, AlertCircle } from "lucide-react";
import { api } from "../api/client";

const STATUS_TABS = [
  { value: "pending",   label: "Pending",   color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  { value: "processed", label: "Processed", color: "text-green-600 bg-green-50 border-green-200" },
  { value: "rejected",  label: "Rejected",  color: "text-red-600 bg-red-50 border-red-200" },
  { value: "all",       label: "All",       color: "text-gray-600 bg-gray-50 border-gray-200" },
];

function StatusBadge({ status }) {
  const map = {
    pending:   "bg-yellow-100 text-yellow-700",
    processed: "bg-green-100 text-green-700",
    rejected:  "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function fmt(date) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function ActionModal({ withdrawal, action, onClose, onDone }) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isProcess = action === "process";

  async function submit() {
    setLoading(true);
    setError("");
    try {
      await api.patch(
        `/withdrawals/${withdrawal.riderId}/${withdrawal._id}/${action}`,
        { adminNote: note }
      );
      onDone();
    } catch (e) {
      setError(e?.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          {isProcess
            ? <CheckCircle className="text-green-500" size={22} />
            : <XCircle className="text-red-500" size={22} />
          }
          <h2 className="text-base font-semibold text-gray-800">
            {isProcess ? "Mark as Processed" : "Reject Withdrawal"}
          </h2>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Rider</span>
            <span className="font-medium text-gray-800">{withdrawal.riderName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Amount</span>
            <span className="font-semibold text-gray-900">NPR {withdrawal.amount?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Method</span>
            <span className="font-medium text-gray-800 capitalize">{withdrawal.method}</span>
          </div>
          {withdrawal.method === "esewa" && withdrawal.esewaPhone && (
            <div className="flex justify-between">
              <span className="text-gray-500">eSewa No.</span>
              <span className="font-medium text-gray-800">{withdrawal.esewaPhone}</span>
            </div>
          )}
          {withdrawal.method === "bank" && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-500">Bank</span>
                <span className="font-medium text-gray-800">{withdrawal.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Account</span>
                <span className="font-medium text-gray-800">{withdrawal.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Holder</span>
                <span className="font-medium text-gray-800">{withdrawal.accountHolder}</span>
              </div>
            </>
          )}
        </div>

        {isProcess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
            Make sure you have <strong>already sent the money</strong> via eSewa or bank transfer before marking as processed.
          </div>
        )}

        {!isProcess && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            Rejecting will <strong>refund NPR {withdrawal.amount?.toLocaleString()}</strong> back to the rider's wallet.
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Admin Note <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isProcess ? "e.g. eSewa ref: 12345678" : "e.g. Invalid account details"}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#DD0303] resize-none"
          />
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-60 ${
              isProcess ? "bg-green-600 hover:bg-green-700" : "bg-[#DD0303] hover:bg-red-700"
            }`}
          >
            {loading ? "Saving..." : isProcess ? "Confirm Processed" : "Reject & Refund"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Withdrawals() {
  const [activeTab, setActiveTab] = useState("pending");
  const [withdrawals, setWithdrawals] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { withdrawal, action }

  const fetchWithdrawals = useCallback(async (tab = activeTab, p = page) => {
    setLoading(true);
    try {
      const res = await api.get(`/withdrawals?status=${tab}&page=${p}&limit=20`);
      setWithdrawals(res.data.withdrawals || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch {
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    fetchWithdrawals(activeTab, page);
  }, [activeTab, page]);

  function changeTab(tab) {
    setActiveTab(tab);
    setPage(1);
  }

  function handleDone() {
    setModal(null);
    fetchWithdrawals(activeTab, page);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Withdrawals</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} request{total !== 1 ? "s" : ""} · {activeTab}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => changeTab(t.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              activeTab === t.value ? t.color : "text-gray-500 bg-white border-gray-200 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading...</div>
        ) : withdrawals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Banknote size={40} className="text-gray-200" />
            <p className="text-gray-400 text-sm">No {activeTab} withdrawal requests</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Rider", "Amount", "Method", "Payout Details", "Status", "Requested", "Note", activeTab === "pending" ? "Actions" : ""].map((h) => h && (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {withdrawals.map((w) => (
                <tr key={String(w._id)} className="hover:bg-gray-50 transition-colors">
                  {/* Rider */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{w.riderName}</p>
                    <p className="text-xs text-gray-400">{w.riderPhone}</p>
                    <p className="text-xs text-gray-400">Wallet: NPR {w.walletBalance?.toLocaleString?.() ?? "—"}</p>
                  </td>
                  {/* Amount */}
                  <td className="px-4 py-3">
                    <span className="font-bold text-gray-900">NPR {w.amount?.toLocaleString()}</span>
                  </td>
                  {/* Method */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                      w.method === "esewa" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {w.method === "esewa" ? <Phone size={11} /> : <Banknote size={11} />}
                      {w.method === "esewa" ? "eSewa" : "Bank"}
                    </span>
                  </td>
                  {/* Payout details */}
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {w.method === "esewa" ? (
                      <span>{w.esewaPhone || "—"}</span>
                    ) : (
                      <div>
                        <p>{w.bankName}</p>
                        <p className="font-mono">{w.accountNumber}</p>
                        <p className="text-gray-400">{w.accountHolder}</p>
                      </div>
                    )}
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3"><StatusBadge status={w.status} /></td>
                  {/* Date */}
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmt(w.createdAt)}</td>
                  {/* Note */}
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[140px]">
                    {w.adminNote || <span className="text-gray-300">—</span>}
                    {w.processedAt && <p className="text-gray-300 mt-0.5">{fmt(w.processedAt)}</p>}
                  </td>
                  {/* Actions (pending only) */}
                  {activeTab === "pending" && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setModal({ withdrawal: w, action: "process" })}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          <CheckCircle size={13} /> Process
                        </button>
                        <button
                          onClick={() => setModal({ withdrawal: w, action: "reject" })}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg border border-red-200 transition-colors"
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ActionModal
          withdrawal={modal.withdrawal}
          action={modal.action}
          onClose={() => setModal(null)}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
