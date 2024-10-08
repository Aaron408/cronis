import React from "react";
import { FaCalendarAlt } from "react-icons/fa";
import { FaBriefcase, FaUser } from "react-icons/fa";

const SideBar = ({ isCollapsed }) => {
  return (
    <aside className={`border-r transition-width duration-300 ${isCollapsed ? "w-20" : "w-64"}`}>
      <div className="h-full overflow-y-auto">
        <div className="space-y-4 py-4">
        <div className={`${isCollapsed ? "px-3" : "px-4"}`}>
            <h2 className={`mb-2 text-lg font-semibold ${isCollapsed ? "hidden" : ""}`}>Navegación</h2>
            <button className="w-full flex items-center text-left px-4 py-2 text-sm font-medium text-gray-900 rounded-md hover:bg-gray-100">
              <FaCalendarAlt className={`inline-block ${!isCollapsed && "mr-2"} h-5 w-5`}/>
              {!isCollapsed && <span>Agenda</span>}
            </button>
          </div>
          <hr className="border-gray-200" />
          <div className={`${isCollapsed ? "px-3" : "px-4"}`}>
            <h2 className={`mb-2 text-lg font-semibold ${isCollapsed ? "hidden" : ""}`}>Proyectos</h2>
            <div className="space-y-1">
              <button className="w-full flex items-center text-left px-4 py-2 text-sm font-medium text-gray-900 rounded-md hover:bg-gray-100">
                <FaBriefcase className={`inline-block ${!isCollapsed && "mr-2"} h-5 w-5`} />
                {!isCollapsed && <span>Trabajo</span>}
              </button>
              <button className="w-full flex items-center text-left px-4 py-2 text-sm font-medium text-gray-900 rounded-md hover:bg-gray-100">
                <FaUser className={`inline-block ${!isCollapsed && "mr-2"} h-5 w-5`} />
                {!isCollapsed && <span>Personal</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default SideBar;
