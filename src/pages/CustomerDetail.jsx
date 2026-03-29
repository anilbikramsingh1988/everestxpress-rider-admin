import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, Wallet } from "lucide-react";
import { api } from "../api/client";

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/customers/${id}`)
      .then((res) => setCustomer(res.data.customer))
      .catch((err) => setError(err?.response?.data?.error || "Failed to load customer"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!customer) return null;

  const txTypes = {
    load: { label: "Load", color: "text-green-600" },
    deduct: { label: "Deduct", color: "text-red-600" },
    refund: { label: "Refund", color: "text-blue-600" },
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/customers")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-xl font-bold text-gray-800">{customer.fullName}</h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Profile card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-700 text-sm mb-4">Profile</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-xs text-gray-500">Full Name</span>
              <span className="text-xs font-medium text-gray-800">{customer.fullName}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-xs text-gray-500">Phone</span>
              <span className="text-xs font-medium text-gray-800">{customer.phone}</span>
            </div>
            {customer.email && (
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-xs text-gray-500">Email</span>
                <span className="text-xs font-medium text-gray-800">{customer.email}</span>
              </div>
            )}
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-xs text-gray-500">Phone Verified</span>
              <span>
                {customer.isPhoneVerified
                  ? <CheckCircle size={16} className="text-green-500" />
                  : <XCircle size={16} className="text-gray-300" />}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-xs text-gray-500">Account Active</span>
              <span>
                {customer.isActive
                  ? <CheckCircle size={16} className="text-green-500" />
                  : <XCircle size={16} className="text-red-400" />}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-50">
              <span className="text-xs text-gray-500">Wallet Balance</span>
              <span className="text-xs font-semibold text-gray-800">NPR {(customer.walletBalance || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-xs text-gray-500">Joined</span>
              <span className="text-xs font-medium text-gray-800">{new Date(customer.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Address */}
        {customer.address && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-700 text-sm mb-4">Address</h3>
            <p className="text-sm text-gray-700">{customer.address.line1}</p>
            <p className="text-sm text-gray-500 mt-1">{[customer.address.city, customer.address.district].filter(Boolean).join(", ")}</p>
          </div>
        )}
      </div>

      {/* Wallet transactions */}
      <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Wallet size={16} className="text-gray-400" />
          <h3 className="font-semibold text-gray-700 text-sm">Recent Wallet Transactions</h3>
        </div>
        {customer.walletTransactions?.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No transactions yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Type", "Amount", "Method", "Note", "Date"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(customer.walletTransactions || []).map((tx) => (
                <tr key={tx._id}>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${txTypes[tx.type]?.color || "text-gray-700"}`}>
                      {txTypes[tx.type]?.label || tx.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-800 font-medium text-xs">NPR {tx.amount}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs capitalize">{tx.method || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{tx.note || "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(tx.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
