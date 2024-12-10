/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef, useContext } from "react";
import { AuthContext } from "../AuthContext";
import { useNavigate } from "react-router-dom";
import { FaUser } from "react-icons/fa";
import { HiMenu } from "react-icons/hi";
import { IoSearch, IoNotificationsOutline } from "react-icons/io5";
import { NotificationsApi } from "../../api";

const sections = [
  { id: 1, title: "Agenda", path: "/home" },
  { id: 2, title: "Actividades", path: "/activities" },
  { id: 3, title: "Historial", path: "/history" },
  { id: 4, title: "Perfil", path: "/profile" },
];

export default function Header({ onToggleSidebar }) {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const userMenuRef = useRef(null);
  const searchRef = useRef(null);
  const notificationsRef = useRef(null);

  const handleCloseNotifications = async () => {
    if (isNotificationsOpen && notifications.length > 0) {
      const notificationIds = notifications.map(
        (notification) => notification.id
      );
      try {
        await NotificationsApi.post("/api/watchedNotifications", {
          notificationIds,
        });
        await fetchNotifications();
      } catch (error) {
        console.error("Error al marcar las notificaciones como vistas:", error);
      }
    }
    setIsNotificationsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchTerm("");
      }
      if (
        isNotificationsOpen &&
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        handleCloseNotifications();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (searchTerm) {
      const results = sections.filter((section) =>
        section.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await NotificationsApi.get("/api/userNotifications");
      setNotificationCount(response.data.notificationCount);
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error("Error al obtener las notificaciones:", error);
    }
  };

  // const handleMenuOptionClick = () => {
  //   setIsUserMenuOpen(false);
  // };

  const handleProfile = () => {
    navigate("/profile");
  };

  const handleLogout = () => {
    logout();
  };

  const handleSearchResultClick = (result) => {
    setSearchTerm("");
    navigate(result.path);
  };

  const handleNotificationsClick = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    if (!isNotificationsOpen) {
      fetchNotifications();
    }
  };

  const handleNotificationClick = (notification) => {
    console.log("Notificación clickeada:", notification);
    handleCloseNotifications();
  };

  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={onToggleSidebar}
          className="text-gray-600 hover:text-gray-900 sm:hidden"
        >
          <HiMenu className="h-7 w-7 mt-1" />
        </button>
        <h1 className="hidden sm:flex text-2xl font-bold">Mi Agenda</h1>
      </div>
      <div className="flex items-center space-x-4">
        <div className="hidden md:flex relative" ref={searchRef}>
          <div className="relative">
            <IoSearch className="absolute left-2.5 top-2.5 h-5 w-5 text-gray-500" />
            <input
              className="pl-9 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              placeholder="Buscar secciones..."
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-10">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleSearchResultClick(result)}
                >
                  <div className="font-medium">{result.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="relative" ref={notificationsRef}>
          <button
            className="text-gray-600 hover:text-gray-900 focus:outline-none mt-2"
            onClick={handleNotificationsClick}
          >
            <IoNotificationsOutline className="h-6 w-6" />
          </button>
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 text-xs text-white bg-red-600 rounded-full px-1.5">
              {notificationCount}
            </span>
          )}
          {isNotificationsOpen && (
            <div className="fixed inset-x-0 top-16 md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 w-full md:w-80 bg-white border border-gray-300 rounded-md shadow-lg z-30">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Notificaciones</h3>
                <button
                  onClick={handleCloseNotifications}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="max-h-[calc(100vh-8rem)] md:max-h-80 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <h4 className="font-medium">{notification.title}</h4>
                      <p className="text-sm text-gray-600">
                        {notification.message}
                      </p>
                      <span className="text-xs text-gray-400">
                        {new Date(notification.date).toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-center text-gray-500">
                    No tienes notificaciones
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="text-gray-600 hover:text-gray-900 focus:outline-none"
          >
            <FaUser className="h-6 w-5 mt-1" />
          </button>
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-30">
              <div className="py-1">
                <button
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={handleProfile}
                >
                  Perfil
                </button>
                {/* <button
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={handleMenuOptionClick}
                >
                  Configuración
                </button> */}
                <button
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={handleLogout}
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
