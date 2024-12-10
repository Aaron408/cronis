import React, { useContext, useEffect, useRef } from "react";
import { FaUsers } from "react-icons/fa";
import { BsBarChartFill } from "react-icons/bs";
import { FiFileText } from "react-icons/fi";
import { IoLogOut } from "react-icons/io5";
import { AuthContext } from "../AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

export default function AdminSideBar({ isSidebarOpen, toggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useContext(AuthContext);
  const sidebarRef = useRef(null);

  const onLogout = () => {
    logout();
  };

  // Detectar clics fuera de la sidebar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        toggleSidebar(); // Cerrar el sidebar si se hace click por fuera de esta
      }
    };

    if (isSidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSidebarOpen, toggleSidebar]);

  // Verifica si la ruta actual coincide con la ruta del item
  const isActiveRoute = (route) => {
    return location.pathname === "/" + route;
  };

  return (
    <>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleSidebar}
        ></div>
      )}

      <div
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg transform z-40 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out md:static md:translate-x-0`}
      >
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Admin Panel</h2>
        </div>
        <div className="mt-4">
          {[
            { name: "Dashboard", icon: BsBarChartFill, route: "dashboard" },
            { name: "Usuarios", icon: FaUsers, route: "users" },
            { name: "Reports", icon: FiFileText, route: "reports" },
          ].map((item) => (
            <button
              key={item.name}
              onClick={() => navigate("/" + item.route)}
              className={`flex items-center w-full px-4 py-2 text-sm font-medium ${
                isActiveRoute(item.route)
                  ? "text-gray-900 bg-gray-100"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </button>
          ))}
        </div>
        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
          <button
            onClick={onLogout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          >
            <IoLogOut className="w-7 h-7 mr-3" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  );
}
