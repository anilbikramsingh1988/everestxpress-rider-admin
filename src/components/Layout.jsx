import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, Users, Truck, Tag, Banknote, Settings2, LogOut, BarChart3, Map } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const navItems = [
  { label: "Dashboard",       icon: LayoutDashboard, to: "/" },
  { label: "Bookings",        icon: Package,         to: "/bookings" },
  { label: "Customers",       icon: Users,           to: "/customers" },
  { label: "Delivery Riders", icon: Truck,           to: "/delivery-riders" },
  { label: "Live Map",        icon: Map,             to: "/live-map" },
  { label: "Finance",         icon: BarChart3,       to: "/finance" },
  { label: "Withdrawals",     icon: Banknote,        to: "/withdrawals" },
  { label: "Promo Codes",     icon: Tag,             to: "/promo-codes" },
  { label: "Settings",        icon: Settings2,       to: "/settings" },
];

export default function Layout({ children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-100">
          <p className="text-xl font-bold text-[#DD0303] leading-tight">Everest Xpress</p>
          <p className="text-xs text-gray-500 mt-0.5">Admin Panel</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ label, icon: Icon, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#DD0303] text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-[#DD0303] transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
        {children}
      </main>
    </div>
  );
}
