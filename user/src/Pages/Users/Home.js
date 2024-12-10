/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import { FiPlus, FiCoffee } from "react-icons/fi";
import { ActivitiesApi } from "../../api";
import { toast } from "react-toastify";
import ActivityModal from "../../Components/User/ActivityModal";
import Header from "../../Components/User/Header";
import SideBar from "../../Components/User/SideBar";
import LoadingScreen from "../../Components/User/LoadingScreen";

export default function Home() {
  const [currentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [displayDate, setDisplayDate] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSchedule = async (date) => {
    try {
      const formattedDate = date.toISOString().split("T")[0];
      const response = await ActivitiesApi.get(
        `/api/schedule?date=${formattedDate}`
      );
      setEvents(response.data);
    } catch (error) {
      console.error("Error al obtener la agenda del usuario", error);
      console.error(
        "Error details:",
        error.response ? error.response.data : error.message
      );
      toast.error("Error al cargar la agenda");
    }
  };

  useEffect(() => {
    fetchSchedule(currentDate);
  }, [currentDate]);

  useEffect(() => {
    if (selectedDate.getTime() !== currentDate.getTime()) {
      fetchSchedule(selectedDate);
    }
  }, [selectedDate]);

  const handleAddEvent = () => {
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
      await ActivitiesApi.post("/api/addActivity", eventData);
      toast.success("Actividad agregada exitosamente!");
      fetchSchedule(currentDate);
      setIsLoading(false);
    } catch (error) {
      if (error.response) {
        const { status, data } = error.response;
        switch (status) {
          case 400:
            switch (data.errorCode) {
              case "WORK_HOURS_NOT_SET":
                toast.error(
                  "Debe configurar su horario de trabajo antes de agregar actividades."
                );
                break;
              case "ACTIVITY_OUTSIDE_WORK_HOURS":
                toast.error(
                  "La actividad debe estar dentro de su horario laboral."
                );
                break;
              default:
                toast.error(data.message || "Error al agregar la actividad.");
            }
            break;
          case 403:
            if (data.errorCode === "ACTIVITY_LIMIT_REACHED") {
              toast.error(
                "Ha alcanzado el límite máximo de actividades de su plan."
              );
            } else {
              toast.error(
                data.message || "No tiene permiso para realizar esta acción."
              );
            }
            break;
          case 404:
            if (data.errorCode === "USER_OR_PLAN_NOT_FOUND") {
              toast.error("Usuario o plan de suscripción no encontrado.");
            } else {
              toast.error(data.message || "Recurso no encontrado.");
            }
            break;
          case 409:
            if (data.errorCode === "PUNCTUAL_ACTIVITY_CONFLICT") {
              toast.error(
                "Ya existe una actividad puntual que se superpone con el horario seleccionado."
              );
            } else {
              toast.error(data.message || "Conflicto al agregar la actividad.");
            }
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

  const renderCalendar = () => {
    const daysInMonth = new Date(
      displayDate.getFullYear(),
      displayDate.getMonth() + 1,
      0
    ).getDate();
    const firstDayOfMonth = new Date(
      displayDate.getFullYear(),
      displayDate.getMonth(),
      1
    ).getDay();
    const days = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="text-center py-1"></div>);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(
        displayDate.getFullYear(),
        displayDate.getMonth(),
        i
      );
      const isCurrentDate =
        dayDate.getDate() === currentDate.getDate() &&
        dayDate.getMonth() === currentDate.getMonth() &&
        dayDate.getFullYear() === currentDate.getFullYear();
      const isSelectedDate =
        dayDate.getDate() === selectedDate.getDate() &&
        dayDate.getMonth() === selectedDate.getMonth() &&
        dayDate.getFullYear() === selectedDate.getFullYear();

      days.push(
        <button
          key={i}
          onClick={() => {
            const newDate = new Date(
              displayDate.getFullYear(),
              displayDate.getMonth(),
              i
            );
            setSelectedDate(newDate);
          }}
          className={`text-center py-1 hover:bg-gray-200 rounded-full ${
            isSelectedDate
              ? "bg-black hover:bg-gray-700 text-white"
              : isCurrentDate
              ? "border-2 border-black"
              : ""
          }`}
        >
          {i}
        </button>
      );
    }

    return days;
  };

  const changeMonth = (increment) => {
    setDisplayDate((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + increment);
      return newDate;
    });
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const renderEventCard = (event) => {
    if (event.type === "Descanso") {
      return (
        <div
          key={event.schedule_id}
          className="rounded-lg border p-4 bg-gray-100"
        >
          <div className="flex items-center mb-2">
            <FiCoffee className="mr-2 text-gray-600" />
            <h3 className="text-lg font-semibold">
              {event.start_time?.slice(0, 5)} - Descanso
            </h3>
          </div>
          <p className="text-sm text-gray-500">Tiempo de descanso</p>
        </div>
      );
    } else {
      return (
        <div key={event.schedule_id} className="rounded-lg border p-4">
          <h3 className="mb-2 text-lg font-semibold">
            {event.start_time?.slice(0, 5)} - {event.title}
          </h3>
          <p className="text-sm text-gray-500">{event.description}</p>
        </div>
      );
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
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-3xl font-bold">Agenda del día</h2>
            </div>
            <div className="flex flex-col md:grid md:grid-cols-2 gap-6">
              <div className="rounded-md border p-4 order-first md:order-last h-fit">
                <div className="mb-4 flex justify-between items-center">
                  <button
                    className="text-gray-600 hover:text-gray-900"
                    onClick={() => changeMonth(-1)}
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <span className="font-semibold">
                    {displayDate.toLocaleString("default", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <button
                    className="text-gray-600 hover:text-gray-900"
                    onClick={() => changeMonth(1)}
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-2 text-sm">
                  {["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"].map((day) => (
                    <div key={day} className="text-center font-semibold bg">
                      {day}
                    </div>
                  ))}
                  {renderCalendar()}
                </div>
              </div>
              <div className="space-y-4 order-last md:order-first">
                <div className="space-y-4 order-last md:order-first">
                  {events.map((event) => renderEventCard(event))}
                </div>
              </div>
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
      />
    </div>
  );
}
