import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, Star, Wallet } from "lucide-react";
import { api } from "../api/client";

const KYC_BADGE = {
  pending: "bg-gray-100 text-gray-600",
  submitted: "bg-yellow-100 text-yellow-700",
  verified: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

function DocPhoto({ label, src }) {
  if (!src) return (
    <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xs text-gray-300 mt-1">Not uploaded</p>
    </div>
  );
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1.5 font-medium">{label}</p>
      <img src={src} alt={label} className="w-full rounded-lg border border-gray-200 object-cover max-h-40" />
    </div>
  );
}

export default function DeliveryRiderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rider, setRider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [kycLoading, setKycLoading] = useState(false);
  const [kycMsg, setKycMsg] = useState("");

  useEffect(() => {
    api
      .get(`/delivery-riders/${id}`)
      .then((res) => setRider(res.data.rider))
      .catch((err) => setError(err?.response?.data?.error || "Failed to load rider"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleKyc(status) {
    setKycLoading(true);
    setKycMsg("");
    try {
      const res = await api.patch(`/delivery-riders/${id}/kyc`, { status });
      setRider((r) => ({ ...r, kyc: { ...r.kyc, status: res.data.rider.kyc.status } }));
      setKycMsg(`KYC ${status === "verified" ? "approved" : "rejected"} successfully.`);
    } catch (err) {
      setKycMsg(err?.response?.data?.error || "Failed to update KYC status.");
    } finally {
      setKycLoading(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!rider) return null;

  const kycStatus = rider.kyc?.status || "pending";
  const avgRating = rider.stats?.averageRating;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/delivery-riders")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-xl font-bold text-gray-800">{rider.fullName}</h1>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${rider.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {rider.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Profile */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start gap-4 mb-5">
            {rider.profilePhoto ? (
              <img src={rider.profilePhoto} alt={rider.fullName} className="w-16 h-16 rounded-full object-cover border border-gray-200" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-400">
                {rider.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-bold text-gray-800">{rider.fullName}</p>
              <p className="text-sm text-gray-500">{rider.phone}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                <span className="text-sm text-gray-700">{avgRating != null ? avgRating.toFixed(1) : "No ratings"}</span>
                {rider.stats?.ratingCount > 0 && (
                  <span className="text-xs text-gray-400">({rider.stats.ratingCount} reviews)</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            {[
              { label: "Vehicle Type", value: rider.vehicleType },
              { label: "Vehicle Number", value: rider.vehicleNumber },
              { label: "Vehicle Brand", value: rider.vehicleBrand },
              { label: "Vehicle Color", value: rider.vehicleColor },
              { label: "Phone Verified", value: rider.isPhoneVerified ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-gray-300" /> },
              { label: "Wallet Balance", value: `NPR ${(rider.walletBalance || 0).toLocaleString()}` },
              { label: "Joined", value: new Date(rider.createdAt).toLocaleDateString() },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-500">{label}</span>
                <span className="text-xs font-medium text-gray-800">{value ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-700 text-sm mb-4">Delivery Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Accepted", value: rider.stats?.accepted || 0, color: "text-blue-600" },
              { label: "Delivered", value: rider.stats?.delivered || 0, color: "text-green-600" },
              { label: "Failed", value: rider.stats?.failed || 0, color: "text-red-600" },
              { label: "Total Earnings", value: `NPR ${(rider.stats?.totalEarnings || 0).toLocaleString()}`, color: "text-purple-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KYC Section */}
      <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-700 text-sm">KYC Documents</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${KYC_BADGE[kycStatus]}`}>
              {kycStatus}
            </span>
          </div>
          {kycStatus === "submitted" && (
            <div className="flex gap-2">
              <button
                onClick={() => handleKyc("verified")}
                disabled={kycLoading}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                {kycLoading ? "..." : "Approve"}
              </button>
              <button
                onClick={() => handleKyc("rejected")}
                disabled={kycLoading}
                className="bg-red-100 hover:bg-red-200 disabled:opacity-60 text-red-700 px-4 py-2 rounded-lg text-sm font-medium"
              >
                {kycLoading ? "..." : "Reject"}
              </button>
            </div>
          )}
        </div>

        {kycMsg && (
          <div className="mb-4 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            {kycMsg}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex justify-between py-1.5 border-b border-gray-50">
            <span className="text-xs text-gray-500">License Number</span>
            <span className="text-xs font-medium text-gray-800">{rider.kyc?.licenseNumber || "—"}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gray-50">
            <span className="text-xs text-gray-500">Bluebook Number</span>
            <span className="text-xs font-medium text-gray-800">{rider.kyc?.bluebookNumber || "—"}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <DocPhoto label="License Front" src={rider.kyc?.licenseFront} />
          <DocPhoto label="License Back" src={rider.kyc?.licenseBack} />
          <DocPhoto label="Bluebook Front" src={rider.kyc?.bluebookFront} />
          <DocPhoto label="Bluebook Back" src={rider.kyc?.bluebookBack} />
        </div>
      </div>

      {/* Wallet Transactions */}
      {rider.walletTransactions?.length > 0 && (
        <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Wallet size={16} className="text-gray-400" />
            <h3 className="font-semibold text-gray-700 text-sm">Wallet Transactions</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Type", "Amount", "Note", "Date"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rider.walletTransactions.slice(-10).reverse().map((tx, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${tx.type === "credit" ? "text-green-600" : "text-red-600"}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-800 font-medium text-xs">NPR {tx.amount}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{tx.note || "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(tx.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
