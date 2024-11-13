import React, { useState, useEffect } from "react";
import { ActivitiesApi } from "../../api";

//Pages
import Header from "../../Components/User/Header";
import SideBar from "../../Components/User/SideBar";

export default function History() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [events, setEvents] = useState([]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const userActivities = async () => {
    try {
      const response = await ActivitiesApi.get("/api/userActivities");
      const data = response.data;
      setEvents(data.length > 0 ? data : []);
    } catch (error) {
      console.error("Error al obtener los datos del usuario", error);
    }
  };

  useEffect(() => {
    userActivities();
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <Header onToggleSidebar={toggleSidebar} />
      <div className="flex flex-1 overflow-hidden">
        <SideBar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <div className="mb-2 flex items-center justify-start">
              <h2 className="text-3xl font-bold">Historial</h2>
            </div>
            <div className="mb-6 flex items-center justify-start">
              <h2 className="text-xl">Mis actividades pasadas</h2>
            </div>
            <div className="flex flex-col md:grid md:grid-cols-2 gap-6">
              {events.map((event) => (
                <div key={event.id} className="rounded-lg border p-4 md:px-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">{event.title}</h3>
                    <span className="text-sm text-gray-500">
                      {`${new Date(
                        event.start_date
                      ).toLocaleDateString()} - ${new Date(
                        event.due_date
                      ).toLocaleDateString()}`}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    {event.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                      {event.status !== "2"
                        ? "En espera"
                        : event.status === "1"
                        ? "En proceso"
                        : "Finalizada"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
