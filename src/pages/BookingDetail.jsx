import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, User, Truck, Package, CreditCard, Calendar } from "lucide-react";
import { api } from "../api/client";

const STATUS_OPTIONS = [
  "PENDING", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED", "CANCELLED",
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

function InfoCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-gray-400" />
        <h3 className="font-semibold text-gray-700 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right max-w-xs">{value ?? "—"}</span>
    </div>
  );
}

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [deliveryRider, setDeliveryRider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    api
      .get(`/bookings/${id}`)
      .then((res) => {
        setBooking(res.data.booking);
        setDeliveryRider(res.data.booking.deliveryRider || null);
        setNewStatus(res.data.booking.status);
      })
      .catch((err) => setError(err?.response?.data?.error || "Failed to load booking"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleStatusSave() {
    if (!newStatus || newStatus === booking.status) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await api.patch(`/bookings/${id}/status`, { status: newStatus });
      setBooking((b) => ({ ...b, status: res.data.booking.status }));
      setSaveMsg("Status updated successfully.");
    } catch (err) {
      setSaveMsg(err?.response?.data?.error || "Failed to update status.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!booking) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/bookings")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-800 font-mono">{booking.trackingNumber}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[booking.status] || "bg-gray-100 text-gray-600"}`}>
              {booking.status}
            </span>
          </div>
        </div>
        {/* Update status */}
        <div className="flex items-center gap-2">
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#DD0303]"
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={handleStatusSave}
            disabled={saving || newStatus === booking.status}
            className="bg-[#DD0303] hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {saveMsg && (
        <div className="mb-4 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {saveMsg}
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-2 gap-4">
        <InfoCard title="Customer" icon={User}>
          <Row label="Name" value={booking.riderId?.fullName} />
          <Row label="Phone" value={booking.riderId?.phone} />
        </InfoCard>

        <InfoCard title="Delivery Rider" icon={Truck}>
          {deliveryRider ? (
            <>
              <Row label="Name" value={deliveryRider.fullName} />
              <Row label="Phone" value={deliveryRider.phone} />
              <Row label="Vehicle" value={`${deliveryRider.vehicleBrand || ""} ${deliveryRider.vehicleType || ""} (${deliveryRider.vehicleNumber || "—"})`} />
            </>
          ) : (
            <>
              <Row label="Name" value={booking.assignedDriverName} />
              <Row label="Phone" value={booking.assignedDriverPhone} />
            </>
          )}
        </InfoCard>

        <InfoCard title="Package" icon={Package}>
          <Row label="Description" value={booking.packageDescription} />
          <Row label="Weight" value={booking.packageWeight != null ? `${booking.packageWeight} kg` : null} />
          <Row label="COD" value={booking.isCOD ? `Yes — NPR ${booking.codAmount}` : "No"} />
        </InfoCard>

        <InfoCard title="Route" icon={MapPin}>
          <div className="mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Pickup</p>
            <p className="text-xs text-gray-800">{booking.pickup?.line1}, {booking.pickup?.city}</p>
            {booking.pickup?.contactName && (
              <p className="text-xs text-gray-500 mt-0.5">{booking.pickup.contactName} · {booking.pickup.contactPhone}</p>
            )}
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Dropoff</p>
            <p className="text-xs text-gray-800">{booking.dropoff?.line1}, {booking.dropoff?.city}</p>
            {booking.dropoff?.contactName && (
              <p className="text-xs text-gray-500 mt-0.5">{booking.dropoff.contactName} · {booking.dropoff.contactPhone}</p>
            )}
          </div>
          {booking.distanceKm != null && (
            <div className="mt-3 pt-2 border-t border-gray-50">
              <Row label="Distance" value={`${booking.distanceKm} km`} />
            </div>
          )}
        </InfoCard>

        <InfoCard title="Payment" icon={CreditCard}>
          <Row label="Method" value={booking.paymentMethod} />
          <Row label="Estimated Fare" value={booking.estimatedFare != null ? `NPR ${booking.estimatedFare}` : null} />
          <Row label="Final Fare" value={booking.finalFare != null ? `NPR ${booking.finalFare}` : null} />
          <Row label="Rider Earnings" value={`NPR ${booking.riderEarnings || 0}`} />
          {booking.esewaRef && <Row label="eSewa Ref" value={booking.esewaRef} />}
        </InfoCard>

        <InfoCard title="Dates" icon={Calendar}>
          <Row label="Created" value={new Date(booking.createdAt).toLocaleString()} />
          <Row label="Updated" value={new Date(booking.updatedAt).toLocaleString()} />
          {booking.cancelledAt && <Row label="Cancelled" value={new Date(booking.cancelledAt).toLocaleString()} />}
          {booking.cancelReason && <Row label="Cancel Reason" value={booking.cancelReason} />}
          {booking.rating && <Row label="Rating" value={`${booking.rating} / 5`} />}
        </InfoCard>
      </div>

      {/* Timeline */}
      {booking.timeline?.length > 0 && (
        <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 text-sm mb-4">Timeline</h3>
          <div className="space-y-2">
            {booking.timeline.map((t, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#DD0303] mt-1.5 flex-shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-gray-700">{t.status}</span>
                  {t.note && <span className="text-xs text-gray-500 ml-2">— {t.note}</span>}
                  <p className="text-xs text-gray-400">{new Date(t.at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proof of delivery */}
      {booking.proofPhoto && (
        <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 text-sm mb-4">Proof of Delivery</h3>
          <img
            src={booking.proofPhoto}
            alt="Proof of delivery"
            className="max-w-sm rounded-lg border border-gray-200"
          />
        </div>
      )}
    </div>
  );
}
