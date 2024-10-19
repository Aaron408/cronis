import React from "react";
import { FaCalendarAlt, FaBriefcase, FaUser } from "react-icons/fa";

const SideBar = ({ isOpen, onClose }) => {
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
              <button className="w-full flex items-center text-left px-4 py-2 text-sm font-medium text-gray-900 rounded-md hover:bg-gray-100">
                <FaCalendarAlt className="inline-block mr-2 h-5 w-5" />
                <span>Agenda</span>
              </button>
            </div>
            <hr className="border-gray-200" />
            <div className="px-4">
              <h2 className="mb-2 text-lg font-semibold">Proyectos</h2>
              <div className="space-y-1">
                <button className="w-full flex items-center text-left px-4 py-2 text-sm font-medium text-gray-900 rounded-md hover:bg-gray-100">
                  <FaBriefcase className="inline-block mr-2 h-5 w-5" />
                  <span>Trabajo</span>
                </button>
                <button className="w-full flex items-center text-left px-4 py-2 text-sm font-medium text-gray-900 rounded-md hover:bg-gray-100">
                  <FaUser className="inline-block mr-2 h-5 w-5" />
                  <span>Personal</span>
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