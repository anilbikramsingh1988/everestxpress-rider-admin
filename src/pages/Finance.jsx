import React, { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";
import {
  TrendingUp, DollarSign, Users, Package,
  ChevronDown, RefreshCw, Download
} from "lucide-react";

const RED = "#DD0303";

function fmt(n) {
  return `NPR ${Number(n || 0).toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-NP", { year: "numeric", month: "short", day: "numeric" });
}

function SummaryCard({ label, value, sub, icon: Icon, color = "#DD0303" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4 shadow-sm">
      <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + "18" }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    DELIVERED:  "bg-green-100 text-green-700",
    PENDING:    "bg-yellow-100 text-yellow-700",
    CANCELLED:  "bg-red-100 text-red-700",
    FAILED:     "bg-orange-100 text-orange-700",
    ASSIGNED:   "bg-blue-100 text-blue-700",
    IN_TRANSIT: "bg-purple-100 text-purple-700",
    PICKED_UP:  "bg-indigo-100 text-indigo-700",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {status?.replace("_", " ")}
    </span>
  );
}

export default function Finance() {
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);
  const [groupBy, setGroupBy] = useState("day");
  const [tab, setTab] = useState("summary"); // summary | report | ledger

  const [summary, setSummary] = useState(null);
  const [report, setReport] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPages, setLedgerPages] = useState(1);
  const [ledgerType, setLedgerType] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadSummary = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get("/finance/summary", { params: { from, to } });
      setSummary(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  const loadReport = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get("/finance/report", { params: { from, to, groupBy } });
      setReport(res.data.rows || []);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [from, to, groupBy]);

  const loadLedger = useCallback(async (page = 1) => {
    setLoading(true); setError(null);
    try {
      const res = await api.get("/finance/ledger", { params: { from, to, type: ledgerType || undefined, page, limit: 20 } });
      setLedger(res.data.entries || []);
      setLedgerTotal(res.data.total || 0);
      setLedgerPage(res.data.page || 1);
      setLedgerPages(res.data.pages || 1);
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [from, to, ledgerType]);

  useEffect(() => {
    if (tab === "summary") loadSummary();
    else if (tab === "report") loadReport();
    else if (tab === "ledger") loadLedger(1);
  }, [tab, from, to, groupBy, ledgerType]);

  function refresh() {
    if (tab === "summary") loadSummary();
    else if (tab === "report") loadReport();
    else if (tab === "ledger") loadLedger(ledgerPage);
  }

  function exportCSV() {
    if (tab === "report" && report.length > 0) {
      const headers = ["Period", "Bookings", "Gross Revenue", "Platform Commission", "Rider Earnings"];
      const rows = report.map(r => [r.period, r.bookings, r.grossRevenue, r.platformCommission, r.riderEarnings]);
      const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `finance-report-${from}-${to}.csv`; a.click();
    } else if (tab === "ledger" && ledger.length > 0) {
      const headers = ["Date", "Rider", "Phone", "Type", "Amount", "Status", "Note"];
      const rows = ledger.map(e => [
        new Date(e.createdAt).toLocaleDateString(),
        e.riderName, e.riderPhone, e.type, e.amount, e.status, `"${e.note || ""}"`
      ]);
      const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `ledger-${from}-${to}.csv`; a.click();
    }
  }

  const s = summary?.summary || {};
  const byStatus = summary?.byStatus || {};

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance & Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Revenue, commissions, and transaction ledger</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
            <Download size={15} /> Export CSV
          </button>
          <button onClick={refresh} disabled={loading} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-white" style={{ backgroundColor: RED }}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Date filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 flex flex-wrap gap-4 items-end shadow-sm">
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" style={{ "--tw-ring-color": RED }} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2" />
        </div>
        {tab === "report" && (
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Group By</label>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
        )}
        {tab === "ledger" && (
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Transaction Type</label>
            <select value={ledgerType} onChange={e => setLedgerType(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="">All Types</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-5 w-fit">
        {[["summary", "Summary"], ["report", "Revenue Report"], ["ledger", "Transaction Ledger"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{error}</div>
      )}

      {/* ── SUMMARY TAB ── */}
      {tab === "summary" && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SummaryCard label="Gross Revenue" value={fmt(s.grossRevenue)} icon={TrendingUp} color="#10b981" sub={`${s.bookingCount || 0} deliveries`} />
            <SummaryCard label="Platform Commission" value={fmt(s.platformCommission)} icon={DollarSign} color="#DD0303" />
            <SummaryCard label="Rider Earnings" value={fmt(s.riderEarnings)} icon={Users} color="#6366f1" />
            <SummaryCard label="Total Bookings" value={Object.values(byStatus).reduce((a, b) => a + b, 0)} icon={Package} color="#f59e0b" sub={`${fmtDate(summary?.from)} – ${fmtDate(summary?.to)}`} />
          </div>

          {/* Booking status breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-700 mb-4">Bookings by Status</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <StatusBadge status={status} />
                  <span className="text-sm font-bold text-gray-800">{count}</span>
                </div>
              ))}
              {Object.keys(byStatus).length === 0 && (
                <p className="text-sm text-gray-400">No data for selected period.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── REPORT TAB ── */}
      {tab === "report" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Period</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Bookings</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Gross Revenue</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Commission</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Rider Earnings</th>
              </tr>
            </thead>
            <tbody>
              {report.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">{loading ? "Loading..." : "No data for selected period."}</td></tr>
              ) : (
                <>
                  {report.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{row.period}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{row.bookings}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-700">{fmt(row.grossRevenue)}</td>
                      <td className="px-4 py-3 text-right font-medium" style={{ color: RED }}>{fmt(row.platformCommission)}</td>
                      <td className="px-4 py-3 text-right font-medium text-indigo-700">{fmt(row.riderEarnings)}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                    <td className="px-4 py-3 text-gray-900">Total</td>
                    <td className="px-4 py-3 text-right text-gray-900">{report.reduce((a, r) => a + r.bookings, 0)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{fmt(report.reduce((a, r) => a + r.grossRevenue, 0))}</td>
                    <td className="px-4 py-3 text-right" style={{ color: RED }}>{fmt(report.reduce((a, r) => a + r.platformCommission, 0))}</td>
                    <td className="px-4 py-3 text-right text-indigo-700">{fmt(report.reduce((a, r) => a + r.riderEarnings, 0))}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── LEDGER TAB ── */}
      {tab === "ledger" && (
        <div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-4">
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">{ledgerTotal} transactions</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Rider</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Amount</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Note</th>
                </tr>
              </thead>
              <tbody>
                {ledger.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">{loading ? "Loading..." : "No transactions found."}</td></tr>
                ) : ledger.map((e, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(e.createdAt).toLocaleString("en-NP")}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{e.riderName}</p>
                      <p className="text-xs text-gray-400">{e.riderPhone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${e.type === "credit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {e.type}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${e.type === "credit" ? "text-green-700" : "text-red-600"}`}>
                      {e.type === "credit" ? "+" : "-"}{fmt(e.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.status === "completed" ? "bg-green-100 text-green-700" : e.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{e.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {ledgerPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Page {ledgerPage} of {ledgerPages}</p>
              <div className="flex gap-2">
                <button disabled={ledgerPage <= 1} onClick={() => loadLedger(ledgerPage - 1)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                  Previous
                </button>
                <button disabled={ledgerPage >= ledgerPages} onClick={() => loadLedger(ledgerPage + 1)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
