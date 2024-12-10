import React, { useState, useEffect } from "react";
import { FiPlus } from "react-icons/fi";
import { ActivitiesApi } from "../../api";
import { toast } from "react-toastify";
import Header from "../../Components/User/Header";
import SideBar from "../../Components/User/SideBar";
import ActivityModal from "../../Components/User/ActivityModal";
import LoadingScreen from "../../Components/User/LoadingScreen";

export default function Activities() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventToDelete, setEventToDelete] = useState(null);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);
  const [isLoading, setIsLoading] = useState(false);

  const userActivities = async () => {
    try {
      const response = await ActivitiesApi.get("/api/userActivities");
      setEvents(response.data.length > 0 ? response.data : []);
    } catch (error) {
      console.error("Error al obtener los datos del usuario", error);
    }
  };

  useEffect(() => {
    userActivities();
  }, []);

  const handleEditEvent = (event) => {
    setEditingEvent({
      ...event,
      start_time: event.start_time || "",
      end_time: event.end_time || "",
    });
    setIsModalOpen(true);
  };

  const handleDeleteEvent = (event) => {
    setEventToDelete(event);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteEvent = async () => {
    setIsLoading(true);
    try {
      setIsDeleteModalOpen(false);
      await ActivitiesApi.post("/api/deleteActivity", {
        activityId: eventToDelete,
      });
      toast.success("Actividad eliminada exitosamente!");
      setIsLoading(false);
      userActivities();
      setEventToDelete(null);
    } catch (error) {
      console.error("Error al eliminar la actividad", error);
      toast.error("Error al eliminar la actividad");
      setIsLoading(true);
    }
  };

  const handleAddEvent = () => {
    setEditingEvent(null);
    ActivitiesApi.get("/api/activitiesData")
      .then((response) => {
        if (response.data.message === "Puedes abrir el modal") {
          setIsModalOpen(true);
        }
      })
      .catch((error) => {
        if (error.response.status === 403) {
          toast.warning(error.response.data.message);
        } else {
          toast.error("Error al intentar añadir una actividad.");
        }
      });
  };

  const handleSaveEvent = async (eventData) => {
    setIsLoading(true);
    try {
      setIsModalOpen(false);
      if (editingEvent) {
        await ActivitiesApi.post(`/api/updateActivities`, eventData);
        toast.success("Actividad actualizada exitosamente!");
        setIsLoading(false);
      } else {
        await ActivitiesApi.post("/api/addActivity", eventData);
        toast.success("Actividad agregada exitosamente!");
        setIsLoading(false);
      }
      await userActivities();
      setEditingEvent(null);
    } catch (error) {
      if (error.response) {
        switch (error.response.status) {
          case 400:
            toast.error(error.response.data.message);
            break;
          case 403:
            toast.error(error.response.data.message);
            break;
          case 409:
            toast.error(error.response.data.message);
            break;
          default:
            console.error("Error al guardar la actividad", error);
            toast.error("Error al guardar la actividad");
        }
        setIsLoading(false);
      } else {
        console.error("Error inesperado", error);
        toast.error("Error inesperado al guardar la actividad");
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex h-screen flex-col">
      {isLoading && <LoadingScreen />}
      <Header onToggleSidebar={toggleSidebar} />
      <div className="flex flex-1 overflow-hidden">
        <SideBar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <div className="mb-6 flex items-center justify-start">
              <h2 className="text-3xl font-bold">Todas mis actividades</h2>
            </div>
            <div className="flex flex-col md:grid md:grid-cols-2 gap-6">
              {events.map((event) => (
                <div key={event.id} className="rounded-lg border p-4 md:px-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">{event.title}</h3>
                    <span className="text-sm text-gray-500">
                      {event.type === "Puntual"
                        ? `${event.start_time}/${event.end_time} - ${event.date
                            .split("-")
                            .reverse()
                            .join("/")}`
                        : "Recurrente"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    {event.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                      {event.status === "0"
                        ? "En espera"
                        : event.status === "1"
                        ? "En proceso"
                        : "Completado"}
                    </span>
                    <div className="mt-2">
                      {event.type === "Recurrente" && (
                        <button
                          className="mr-2 px-3 py-1.5 bg-black hover:bg-gray-800 text-white rounded-md hover:rounded-md"
                          onClick={() => handleEditEvent(event)}
                        >
                          Editar
                        </button>
                      )}
                      <button
                        className="text-red-500 px-3 py-1.5 hover:bg-gray-100 hover:text-black hover:rounded-md"
                        onClick={() => handleDeleteEvent(event.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
      <button
        onClick={handleAddEvent}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-black text-white shadow-lg hover:bg-gray-800 focus:outline-none"
      >
        <FiPlus className="h-8 w-8 m-auto" />
      </button>

      <ActivityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        editingEvent={editingEvent}
      />

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-2xl font-bold mb-4">Confirmar Eliminación</h2>
            <p className="mb-6">¿Estás seguro de eliminar esta actividad?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteEvent}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
