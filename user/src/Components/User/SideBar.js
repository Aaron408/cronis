import React from "react";
import { FaCalendarAlt, FaHistory, FaClipboardList } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";

const SideBar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r transition-transform duration-300 ease-in-out transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0`}
      >
        <div className="h-full overflow-y-auto">
          <div className="space-y-4 py-4">
            <div className="px-4">
              <h2 className="mb-2 text-lg font-semibold">Navegación</h2>
              <button
                onClick={() => location.pathname !== "/home" && navigate("/home")}
                className="w-full flex items-center text-left px-4 py-2 text-sm font-medium text-gray-900 rounded-md hover:bg-gray-100"
              >
                <FaCalendarAlt className="inline-block mr-2 h-5 w-5" />
                <span>Agenda</span>
              </button>
            </div>
            <hr className="border-gray-200" />
            <div className="px-4">
              <h2 className="mb-2 text-lg font-semibold">Proyectos</h2>
              <div className="space-y-1">
                <button
                  onClick={() => navigate("/activities")}
                  className="w-full flex items-center text-left px-4 py-2 text-sm font-medium text-gray-900 rounded-md hover:bg-gray-100"
                >
                  <FaClipboardList className="inline-block mr-2 h-5 w-5" />
                  <span>Activas</span>
                </button>
                <button
                  onClick={() => navigate("/history")}
                  className="w-full flex items-center text-left px-4 py-2 text-sm font-medium text-gray-900 rounded-md hover:bg-gray-100"
                >
                  <FaHistory className="inline-block mr-2 h-5 w-5" />
                  <span>Historial</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default SideBar;
