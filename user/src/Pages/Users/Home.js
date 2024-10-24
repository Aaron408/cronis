import React, { useState, useEffect } from "react";
import { FiPlus } from "react-icons/fi";
import { MdOutlineKeyboardArrowLeft } from "react-icons/md";

//Pages
import Header from "../../Components/User/Header";
import SideBar from "../../Components/User/SideBar";

export default function Home() {
  const [date, setDate] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const events = [
    {
      time: "9:00 AM",
      title: "Reunión de equipo",
      description: "Discutir los objetivos semanales y asignar tareas.",
    },
    {
      time: "11:00 AM",
      title: "Revisión de proyecto",
      description: "Analizar el progreso del proyecto actual con el cliente.",
    },
    {
      time: "2:00 PM",
      title: "Sesión de brainstorming",
      description: "Generar ideas para la nueva campaña de marketing.",
    },
  ];

  const renderCalendar = () => {
    const daysInMonth = new Date(
      date.getFullYear(),
      date.getMonth() + 1,
      0
    ).getDate();
    const firstDayOfMonth = new Date(
      date.getFullYear(),
      date.getMonth(),
      1
    ).getDay();
    const days = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="text-center py-1"></div>);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(
        <button
          key={i}
          onClick={() =>
            setDate(new Date(date.getFullYear(), date.getMonth(), i))
          }
          className={`text-center py-1 hover:bg-gray-200 rounded-full ${
            i === date.getDate() ? "bg-black hover:bg-gray-700 text-white" : ""
          }`}
        >
          {i}
        </button>
      );
    }

    return days;
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

  return (
    <div className="flex h-screen flex-col">
      <Header onToggleSidebar={toggleSidebar} />
      <div className="flex flex-1 overflow-hidden">
      <SideBar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-3xl font-bold">Agenda del día</h2>
              <div className="flex items-center space-x-2">
                <button className="p-2 rounded-md border border-gray-300 hover:bg-gray-100">
                  <MdOutlineKeyboardArrowLeft className="h-4 w-4" />
                </button>
                <button className="p-2 rounded-md border border-gray-300 hover:bg-gray-100">
                  <MdOutlineKeyboardArrowLeft className="h-4 w-4 rotate-180" />
                </button>
              </div>
            </div>
            <div className="flex flex-col md:grid md:grid-cols-2 gap-6">
              <div className="rounded-md border p-4 order-first md:order-last">
                <div className="mb-4 flex justify-between items-center">
                  <button className="text-gray-600 hover:text-gray-900">
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
                    {date.toLocaleString("default", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <button className="text-gray-600 hover:text-gray-900">
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
                {events.map((event, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <h3 className="mb-2 text-lg font-semibold">
                      {event.time} - {event.title}
                    </h3>
                    <p className="text-sm text-gray-500">{event.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
      <button className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-black text-white shadow-lg hover:bg-gray-800 focus:outline-none">
        <FiPlus className="h-8 w-8 m-auto" />
      </button>
    </div>
  );
}
