import React, { useState, useContext } from "react";

//Pages
import AdminHeader from "../../Components/AdminHeader";
import AdminSideBar from "../../Components/AdminSideBar";

const Dashboard = () => {
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

        <div className="p-6">
          {/* Tarjetitas info */}
          <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-3">
            {[
              { title: "Usuario totales", value: "1,234", change: "+5%" },
              { title: "Total recaudado", value: "$12,345", change: "+12%" },
              { title: "Active activities", value: "42", change: "-2%" },
            ].map((card, index) => (
              <div key={index} className="p-4 bg-white rounded-lg shadow">
                <h3 className="text-base font-medium text-gray-900">
                  {card.title}
                </h3>
                <div className="flex items-baseline mt-4">
                  <p className="text-2xl font-semibold text-gray-900">
                    {card.value}
                  </p>
                  <p
                    className={`ml-2 text-sm font-medium ${
                      card.change.startsWith("+")
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {card.change}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Graficas */}
          <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
            <div className="p-4 bg-white rounded-lg shadow">
              <h3 className="text-base font-medium text-gray-900 mb-4">
                Crecimiento en usuarios
              </h3>
              <div className="h-60 bg-gray-200 rounded"></div>
            </div>
            <div className="p-4 bg-white rounded-lg shadow">
              <h3 className="text-base font-medium text-gray-900 mb-4">
                Gráfica de ganancias
              </h3>
              <div className="h-60 bg-gray-200 rounded"></div>
            </div>
          </div>

          {/* Usuarior recientes */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Actividad reciente
              </h3>
            </div>
            <ul>
              {[
                {
                  user: "John Doe",
                  action: "created a new project",
                  time: "2 hours ago",
                },
                {
                  user: "Jane Smith",
                  action: "completed a task",
                  time: "4 hours ago",
                },
                {
                  user: "Bob Johnson",
                  action: "uploaded a file",
                  time: "1 day ago",
                },
                {
                  user: "Alice Brown",
                  action: "commented on a project",
                  time: "2 days ago",
                },
              ].map((activity, index) => (
                <li
                  key={index}
                  className="px-4 py-3 border-b border-gray-200 last:border-b-0"
                >
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">
                      {activity.user}
                    </span>{" "}
                    {activity.action}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
