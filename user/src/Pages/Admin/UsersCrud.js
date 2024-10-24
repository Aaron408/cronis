import React, { useState, useContext } from "react";

//Pages
import AdminHeader from "../../Components/AdminHeader";
import AdminSideBar from "../../Components/AdminSideBar";

const Users = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSideBar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <AdminHeader toggleSidebar={toggleSidebar} />

        {/* Contenido */}
        <div className="p-6">
          {/* Tarjetitas info */}
          
        </div>
      </div>
    </div>
  );
};

export default Users;
