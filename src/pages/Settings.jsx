import React, { useCallback, useEffect, useState } from "react";
import {
  Settings2, Clock, CalendarDays, Wallet, Play, CheckCircle,
  XCircle, AlertCircle, Loader2, RefreshCw,
} from "lucide-react";
import { api } from "../api/client";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

function StatusBadge({ status }) {
  if (!status) return <span className="text-xs text-gray-400">Never run</span>;
  const map = {
    success: "bg-green-100 text-green-700",
    partial: "bg-yellow-100 text-yellow-700",
    failed:  "bg-red-100 text-red-700",
  };
  const icons = {
    success: <CheckCircle size={12} />,
    partial: <AlertCircle size={12} />,
    failed:  <XCircle size={12} />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${map[status]}`}>
      {icons[status]} {status}
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

function padTwo(n) {
  return String(n).padStart(2, "0");
}

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [runningET, setRunningET] = useState(false);
  const [runningS,  setRunningS]  = useState(false);
  const [toast, setToast]       = useState(null);

  // Local form state
  const [et, setEt] = useState(null);   // earningsTransfer
  const [s,  setS]  = useState(null);   // settlement
  const [commissionRate, setCommissionRate] = useState(15);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/settings");
      const cfg = res.data.settings;
      setSettings(cfg);
      setEt({ ...cfg.earningsTransfer });
      setS({ ...cfg.settlement });
      setCommissionRate(cfg.commissionRate ?? 15);
    } catch {
      showToast("error", "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await api.put("/settings", {
        commissionRate: Number(commissionRate),
        earningsTransfer: {
          enabled:   et.enabled,
          hour:      Number(et.hour),
          minute:    Number(et.minute),
        },
        settlement: {
          enabled:       s.enabled,
          dayOfWeek:     Number(s.dayOfWeek),
          hour:          Number(s.hour),
          minute:        Number(s.minute),
          minimumAmount: Number(s.minimumAmount),
        },
      });
      const cfg = res.data.settings;
      setSettings(cfg);
      setEt({ ...cfg.earningsTransfer });
      setS({ ...cfg.settlement });
      showToast("success", "Settings saved");
    } catch {
      showToast("error", "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function runNow(type) {
    const isET = type === "earnings";
    if (isET) setRunningET(true); else setRunningS(true);
    try {
      const endpoint = isET ? "/settings/run-earnings-transfer" : "/settings/run-settlement";
      const res = await api.post(endpoint);
      const stats = res.data.stats;
      if (stats?.skipped) {
        showToast("info", `Skipped — already running or no eligible riders`);
      } else if (isET) {
        showToast("success", `Transferred NPR ${stats.totalAmount?.toLocaleString()} for ${stats.riders} rider(s) across ${stats.bookings} booking(s)`);
      } else {
        showToast("success", `Settlement queued for ${stats.riders} rider(s) · NPR ${stats.totalAmount?.toLocaleString()} · ${stats.skipped} skipped (no payout method)`);
      }
      await load(); // refresh last-run stats
    } catch (e) {
      showToast("error", e?.response?.data?.error || "Run failed");
    } finally {
      if (isET) setRunningET(false); else setRunningS(false);
    }
  }

  if (loading || !et || !s) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        <Loader2 size={20} className="animate-spin mr-2" /> Loading settings…
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure automated earnings transfer and weekly settlement</p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
          toast.type === "success" ? "bg-green-50 text-green-800 border border-green-200" :
          toast.type === "error"   ? "bg-red-50 text-red-800 border border-red-200" :
                                     "bg-blue-50 text-blue-800 border border-blue-200"
        }`}>
          {toast.type === "success" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      <div className="space-y-6">

        {/* ── Commission Rate ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Settings2 size={20} className="text-[#DD0303]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Platform Commission</h2>
              <p className="text-xs text-gray-500 mt-0.5">Percentage deducted from each delivery fare as platform fee</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <input
                type="number"
                min={0}
                max={100}
                value={commissionRate}
                onChange={e => setCommissionRate(e.target.value)}
                className="w-20 px-3 py-2 text-sm text-center font-bold focus:outline-none"
              />
              <span className="px-3 py-2 bg-gray-50 text-sm text-gray-500 border-l border-gray-200">%</span>
            </div>
            <p className="text-sm text-gray-500">
              e.g. on a NPR 500 delivery: <span className="font-semibold text-[#DD0303]">NPR {Math.round(500 * commissionRate / 100)} commission</span>, rider earns <span className="font-semibold text-green-700">NPR {500 - Math.round(500 * commissionRate / 100)}</span>
            </p>
          </div>
        </div>

        {/* ── Daily Earnings Transfer ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Wallet size={20} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Daily Earnings Transfer</h2>
                <p className="text-xs text-gray-500 mt-0.5">Credits each rider's wallet with their delivery earnings</p>
              </div>
            </div>
            {/* Toggle */}
            <button
              onClick={() => setEt((v) => ({ ...v, enabled: !v.enabled }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${et.enabled ? "bg-[#DD0303]" : "bg-gray-200"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${et.enabled ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Time picker */}
          <div className="flex items-center gap-3 mb-5">
            <Clock size={15} className="text-gray-400" />
            <span className="text-sm text-gray-600 font-medium">Run daily at</span>
            <select
              value={et.hour}
              onChange={(e) => setEt((v) => ({ ...v, hour: Number(e.target.value) }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD0303]"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>{padTwo(h)}</option>
              ))}
            </select>
            <span className="text-gray-500">:</span>
            <select
              value={et.minute}
              onChange={(e) => setEt((v) => ({ ...v, minute: Number(e.target.value) }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD0303]"
            >
              {MINUTES.map((m) => (
                <option key={m} value={m}>{padTwo(m)}</option>
              ))}
            </select>
            <span className="text-sm text-gray-400">Nepal Standard Time</span>
          </div>

          {/* Last run info */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1.5 mb-4">
            <div className="flex justify-between">
              <span>Last run</span>
              <span className="font-medium text-gray-700">{fmt(settings.earningsTransfer.lastRunAt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <StatusBadge status={settings.earningsTransfer.lastRunStatus} />
            </div>
            {settings.earningsTransfer.lastRunStats?.riders > 0 && (
              <>
                <div className="flex justify-between">
                  <span>Riders credited</span>
                  <span className="font-medium text-gray-700">{settings.earningsTransfer.lastRunStats.riders}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bookings processed</span>
                  <span className="font-medium text-gray-700">{settings.earningsTransfer.lastRunStats.bookings}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total transferred</span>
                  <span className="font-semibold text-gray-900">NPR {settings.earningsTransfer.lastRunStats.totalAmount?.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => runNow("earnings")}
            disabled={runningET}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {runningET ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Run Now
          </button>
        </div>

        {/* ── Weekly Settlement ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <CalendarDays size={20} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Weekly Settlement</h2>
                <p className="text-xs text-gray-500 mt-0.5">Auto-creates withdrawal requests for eligible riders</p>
              </div>
            </div>
            <button
              onClick={() => setS((v) => ({ ...v, enabled: !v.enabled }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${s.enabled ? "bg-[#DD0303]" : "bg-gray-200"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${s.enabled ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Day + Time */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <CalendarDays size={15} className="text-gray-400" />
            <span className="text-sm text-gray-600 font-medium">Run every</span>
            <select
              value={s.dayOfWeek}
              onChange={(e) => setS((v) => ({ ...v, dayOfWeek: Number(e.target.value) }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD0303]"
            >
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
            <span className="text-sm text-gray-600 font-medium">at</span>
            <select
              value={s.hour}
              onChange={(e) => setS((v) => ({ ...v, hour: Number(e.target.value) }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD0303]"
            >
              {HOURS.map((h) => <option key={h} value={h}>{padTwo(h)}</option>)}
            </select>
            <span className="text-gray-500">:</span>
            <select
              value={s.minute}
              onChange={(e) => setS((v) => ({ ...v, minute: Number(e.target.value) }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD0303]"
            >
              {MINUTES.map((m) => <option key={m} value={m}>{padTwo(m)}</option>)}
            </select>
            <span className="text-sm text-gray-400">NST</span>
          </div>

          {/* Minimum amount */}
          <div className="flex items-center gap-3 mb-5">
            <Settings2 size={15} className="text-gray-400" />
            <span className="text-sm text-gray-600 font-medium">Minimum payout threshold</span>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <span className="px-3 py-1.5 bg-gray-50 text-xs text-gray-500 font-medium border-r border-gray-200">NPR</span>
              <input
                type="number"
                min="0"
                value={s.minimumAmount}
                onChange={(e) => setS((v) => ({ ...v, minimumAmount: e.target.value }))}
                className="w-24 px-3 py-1.5 text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Last run info */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1.5 mb-4">
            <div className="flex justify-between">
              <span>Last run</span>
              <span className="font-medium text-gray-700">{fmt(settings.settlement.lastRunAt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Status</span>
              <StatusBadge status={settings.settlement.lastRunStatus} />
            </div>
            {settings.settlement.lastRunStats?.riders > 0 && (
              <>
                <div className="flex justify-between">
                  <span>Riders settled</span>
                  <span className="font-medium text-gray-700">{settings.settlement.lastRunStats.riders}</span>
                </div>
                <div className="flex justify-between">
                  <span>Skipped (no payout method)</span>
                  <span className="font-medium text-gray-700">{settings.settlement.lastRunStats.skipped}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total queued</span>
                  <span className="font-semibold text-gray-900">NPR {settings.settlement.lastRunStats.totalAmount?.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 mb-4">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <span>Riders must have a <strong>default payout method</strong> set in their profile to be included in auto-settlement. Skipped riders can request withdrawal manually.</span>
          </div>

          <button
            onClick={() => runNow("settlement")}
            disabled={runningS}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {runningS ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Run Now
          </button>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#DD0303] hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>

      </div>
    </div>
  );
}
