import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Truck, Package, Activity, DollarSign, AlertCircle } from "lucide-react";
import { api } from "../api/client";

const statConfig = [
  {
    key: "totalCustomers",
    label: "Total Customers",
    icon: Users,
    color: "bg-blue-100 text-blue-600",
    border: "border-blue-100",
  },
  {
    key: "totalDeliveryRiders",
    label: "Delivery Riders",
    icon: Truck,
    color: "bg-green-100 text-green-600",
    border: "border-green-100",
  },
  {
    key: "totalBookings",
    label: "Total Bookings",
    icon: Package,
    color: "bg-purple-100 text-purple-600",
    border: "border-purple-100",
  },
  {
    key: "activeBookings",
    label: "Active Bookings",
    icon: Activity,
    color: "bg-orange-100 text-orange-600",
    border: "border-orange-100",
  },
  {
    key: "totalRevenue",
    label: "Total Revenue",
    icon: DollarSign,
    color: "bg-red-100 text-red-600",
    border: "border-red-100",
    prefix: "NPR ",
    format: true,
  },
  {
    key: "pendingKyc",
    label: "Pending KYC",
    icon: AlertCircle,
    color: "bg-yellow-100 text-yellow-600",
    border: "border-yellow-100",
    clickable: true,
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/stats")
      .then((res) => setStats(res.data.stats))
      .catch((err) => setError(err?.response?.data?.error || "Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-200" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
                  <div className="h-6 bg-gray-200 rounded w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        {statConfig.map(({ key, label, icon: Icon, color, border, prefix, format, clickable }) => {
          let value = stats?.[key] ?? 0;
          let display = format ? `${prefix || ""}${Number(value).toLocaleString()}` : `${prefix || ""}${Number(value).toLocaleString()}`;

          return (
            <div
              key={key}
              onClick={clickable ? () => navigate("/delivery-riders?kycStatus=submitted") : undefined}
              className={`bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-center gap-4 ${
                clickable ? "cursor-pointer hover:shadow-md transition-shadow" : ""
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-0.5">{display}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
