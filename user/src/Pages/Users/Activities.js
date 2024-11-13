import React, { useState, useEffect, useRef } from "react";
import { FiPlus, FiEdit, FiTrash2 } from "react-icons/fi";
import { MdOutlineKeyboardArrowLeft } from "react-icons/md";
import { ActivitiesApi } from "../../api";

//Pages
import Header from "../../Components/User/Header";
import SideBar from "../../Components/User/SideBar";
import { toast } from "react-toastify";

export default function Activities() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    importance: "0",
    status: "0",
    start_date: new Date().toISOString().split("T")[0],
    due_date: new Date().toISOString().split("T")[0],
    type: "Recurrente",
    date: new Date().toISOString().split("T")[0],
    start_time: "",
    end_time: "",
  });
  const modalRef = useRef(null);
  const deleteModalRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setIsModalOpen(false);
      }
      if (
        deleteModalRef.current &&
        !deleteModalRef.current.contains(event.target)
      ) {
        setIsDeleteModalOpen(false);
      }
    };

    if (isModalOpen || isDeleteModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isModalOpen, isDeleteModalOpen]);

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
    try {
      await ActivitiesApi.post("/api/deleteActivity", { activityId: eventToDelete });
      toast.success("Actividad eliminada exitosamente!");
      userActivities();
      setIsDeleteModalOpen(false);
      setEventToDelete(null);
    } catch (error) {
      console.error("Error al eliminar la actividad", error);
      toast.error("Error al eliminar la actividad");
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (editingEvent) {
      try {
        const response = await ActivitiesApi.post(
          `/api/updateActivities`,
          editingEvent
        );
        toast.success("Actividad actualizada exitosamente!.");
        userActivities();
        setIsModalOpen(false);
        setEditingEvent(null);
      } catch (error) {
        console.error("Error al actualizar la actividad", error);
      }
    }
  };

  const handleAddEvent = () => {
    setEditingEvent(null);
    setNewEvent({
      title: "",
      description: "",
      importance: "0",
      status: "0",
      start_date: new Date().toISOString().split("T")[0],
      due_date: new Date().toISOString().split("T")[0],
      type: "Recurrente",
      date: new Date().toISOString().split("T")[0],
      start_time: "",
      end_time: "",
    });
    setIsModalOpen(true);
  };

  const handleSaveNewEvent = async (e) => {
    e.preventDefault();
    try {
      const response = await ActivitiesApi.post("/api/addActivity", newEvent);
      userActivities();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error al agregar la actividad", error);
    }
  };

  return (
    <div className="flex h-screen flex-col">
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
                        ? `${event.start_time}/${event.end_time} - ${new Date(
                            event.date
                          ).toLocaleDateString()}`
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
                      <button
                        className="mr-2 px-3 py-1.5 bg-black hover:bg-gray-800 text-white rounded-md hover:rounded-md"
                        onClick={() => handleEditEvent(event)}
                      >
                        Editar
                      </button>
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 overflow-auto">
          <div
            className="bg-white p-6 rounded-lg w-96 md:w-[50%] max-h-[90vh] overflow-y-auto"
            ref={modalRef}
          >
            <h2 className="text-2xl font-bold mb-4">
              {editingEvent ? "Editar Actividad" : "Agregar Actividad"}
            </h2>
            <form onSubmit={editingEvent ? handleSaveEdit : handleSaveNewEvent}>
              <div className="mb-4">
                <label
                  htmlFor="title"
                  className="block text-md font-semibold mb-2"
                >
                  Título
                </label>
                <input
                  type="text"
                  id="title"
                  value={editingEvent ? editingEvent.title : newEvent.title}
                  onChange={(e) =>
                    editingEvent
                      ? setEditingEvent({
                          ...editingEvent,
                          title: e.target.value,
                        })
                      : setNewEvent({ ...newEvent, title: e.target.value })
                  }
                  className="border-gray-300 shadow-sm w-full px-4 py-2 border rounded-md"
                  required
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="description"
                  className="block text-md font-semibold mb-2"
                >
                  Descripción
                </label>
                <textarea
                  id="description"
                  value={
                    editingEvent
                      ? editingEvent.description
                      : newEvent.description
                  }
                  onChange={(e) =>
                    editingEvent
                      ? setEditingEvent({
                          ...editingEvent,
                          description: e.target.value,
                        })
                      : setNewEvent({
                          ...newEvent,
                          description: e.target.value,
                        })
                  }
                  className="border-gray-300 shadow-sm w-full px-4 py-2 border rounded-md"
                  rows={3}
                  required
                ></textarea>
              </div>
              <div className="mb-4">
                <label
                  htmlFor="type"
                  className="block text-md font-semibold mb-2"
                >
                  Tipo de actividad
                </label>
                <select
                  id="type"
                  value={editingEvent ? editingEvent.type : newEvent.type}
                  onChange={(e) =>
                    editingEvent
                      ? setEditingEvent({
                          ...editingEvent,
                          type: e.target.value,
                        })
                      : setNewEvent({ ...newEvent, type: e.target.value })
                  }
                  className="border-gray-300 shadow-sm w-full px-4 py-2 border rounded-md"
                  required
                >
                  <option value="Puntual">Puntual</option>
                  <option value="Recurrente">Recurrente</option>
                </select>
              </div>
              {(editingEvent ? editingEvent.type : newEvent.type) ===
                "Puntual" && (
                <>
                  <div className="mb-4">
                    <label
                      htmlFor="date"
                      className="block text-md font-semibold mb-2"
                    >
                      Fecha
                    </label>
                    <input
                      type="date"
                      id="date"
                      value={editingEvent ? editingEvent.date : newEvent.date}
                      onChange={(e) =>
                        editingEvent
                          ? setEditingEvent({
                              ...editingEvent,
                              date: e.target.value,
                            })
                          : setNewEvent({ ...newEvent, date: e.target.value })
                      }
                      className="border-gray-300 shadow-sm w-full px-4 py-2 border rounded-md"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:mb-5">
                      <label
                        htmlFor="start_time"
                        className="block text-md font-semibold mb-2"
                      >
                        Hora de inicio
                      </label>
                      <input
                        type="time"
                        id="start_time"
                        value={
                          editingEvent
                            ? editingEvent.start_time
                            : newEvent.start_time
                        }
                        onChange={(e) =>
                          editingEvent
                            ? setEditingEvent({
                                ...editingEvent,
                                start_time: e.target.value,
                              })
                            : setNewEvent({
                                ...newEvent,
                                start_time: e.target.value,
                              })
                        }
                        className="border-gray-300 shadow-sm w-full px-4 py-2 border rounded-md"
                        required
                      />
                    </div>
                    <div className="md:mb-8">
                      <label
                        htmlFor="end_time"
                        className="block text-md font-semibold mb-2"
                      >
                        Hora de fin
                      </label>
                      <input
                        type="time"
                        id="end_time"
                        value={
                          editingEvent
                            ? editingEvent.end_time
                            : newEvent.end_time
                        }
                        onChange={(e) =>
                          editingEvent
                            ? setEditingEvent({
                                ...editingEvent,
                                end_time: e.target.value,
                              })
                            : setNewEvent({
                                ...newEvent,
                                end_time: e.target.value,
                              })
                        }
                        className="border-gray-300 shadow-sm w-full px-4 py-2 border rounded-md"
                        required
                      />
                    </div>
                  </div>
                </>
              )}
              <div className="mb-4">
                <label
                  htmlFor="importance"
                  className="block text-md font-semibold mb-2"
                >
                  Importancia
                </label>
                <select
                  id="importance"
                  value={
                    editingEvent ? editingEvent.importance : newEvent.importance
                  }
                  onChange={(e) =>
                    editingEvent
                      ? setEditingEvent({
                          ...editingEvent,
                          importance: e.target.value,
                        })
                      : setNewEvent({ ...newEvent, importance: e.target.value })
                  }
                  className="border-gray-300 shadow-sm w-full px-4 py-2 border rounded-md"
                  required
                >
                  <option value="0">Baja</option>
                  <option value="1">Media</option>
                  <option value="2">Alta</option>
                </select>
              </div>
              <div className="mb-4">
                <label
                  htmlFor="start_date"
                  className="block text-md font-semibold mb-2"
                >
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  id="start_date"
                  value={
                    editingEvent ? editingEvent.start_date : newEvent.start_date
                  }
                  onChange={(e) =>
                    editingEvent
                      ? setEditingEvent({
                          ...editingEvent,
                          start_date: e.target.value,
                        })
                      : setNewEvent({ ...newEvent, start_date: e.target.value })
                  }
                  className="border-gray-300 shadow-sm w-full px-4 py-2 border rounded-md"
                  required
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="due_date"
                  className="block text-md font-semibold mb-2"
                >
                  Fecha de entrega
                </label>
                <input
                  type="date"
                  id="due_date"
                  value={
                    editingEvent ? editingEvent.due_date : newEvent.due_date
                  }
                  onChange={(e) =>
                    editingEvent
                      ? setEditingEvent({
                          ...editingEvent,
                          due_date: e.target.value,
                        })
                      : setNewEvent({ ...newEvent, due_date: e.target.value })
                  }
                  className="border-gray-300 shadow-sm w-full px-4 py-2 border rounded-md"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-8 md:mt-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
                >
                  {editingEvent ? "Guardar cambios" : "Agregar actividad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg w-96" ref={deleteModalRef}>
            <h2 className="text-2xl font-bold mb-4">Confirmar Eliminación</h2>
            <p className="mb-6">¿Estás seguro de eliminar este usuario?</p>
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
