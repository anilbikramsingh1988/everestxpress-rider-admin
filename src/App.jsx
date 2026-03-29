import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Bookings from "./pages/Bookings.jsx";
import BookingDetail from "./pages/BookingDetail.jsx";
import Customers from "./pages/Customers.jsx";
import CustomerDetail from "./pages/CustomerDetail.jsx";
import DeliveryRiders from "./pages/DeliveryRiders.jsx";
import DeliveryRiderDetail from "./pages/DeliveryRiderDetail.jsx";
import PromoCodes from "./pages/PromoCodes.jsx";
import Withdrawals from "./pages/Withdrawals.jsx";
import Finance     from "./pages/Finance.jsx";
import LiveMap     from "./pages/LiveMap.jsx";
import Settings    from "./pages/Settings.jsx";

function RequireAuth({ children }) {
  const token = localStorage.getItem("admin_token");
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={
            <RequireAuth>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/bookings" element={<Bookings />} />
                  <Route path="/bookings/:id" element={<BookingDetail />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/customers/:id" element={<CustomerDetail />} />
                  <Route path="/delivery-riders" element={<DeliveryRiders />} />
                  <Route path="/delivery-riders/:id" element={<DeliveryRiderDetail />} />
                  <Route path="/live-map" element={<LiveMap />} />
                  <Route path="/finance" element={<Finance />} />
                  <Route path="/withdrawals" element={<Withdrawals />} />
                  <Route path="/promo-codes" element={<PromoCodes />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </RequireAuth>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
