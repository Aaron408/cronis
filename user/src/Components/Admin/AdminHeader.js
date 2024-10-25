import React, { useEffect, useState, useRef, useContext } from "react";
import { AuthContext } from "../AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

import { FaSearch, FaChevronDown } from "react-icons/fa";
import { IoNotificationsOutline } from "react-icons/io5";
import { HiMenu } from "react-icons/hi";
import { UsersApi } from "../../api";
import { toast } from "react-toastify";

export default function AdminHeader({ toggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useContext(AuthContext);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [usuario, setUsuario] = useState({
    name: "",
    email: "",
    biography: "",
    profile_picture_url: "",
  });
  const userMenuRef = useRef(null);

  const userData = async () => {
    try {
      const response = await UsersApi.get("/api/adminData");
      const data = response.data;
      setUsuario(data);
    } catch (error) {
      console.error("Error al obtener los datos del usuario", error);
      toast.error("Error al obtener los datos del usuario");
    }
  };

  useEffect(() => {
    userData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleProfile = () => {
    setIsUserMenuOpen(false); // Cierra el menú cuando se selecciona
    navigate("/profile");
  };

  const handleLogout = () => {
    setIsUserMenuOpen(false); // Cierra el menú al hacer logout
    logout();
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="text-gray-600 hover:text-gray-900 md:hidden"
          >
            <HiMenu className="h-7 w-7 mt-1" />
          </button>
          <h1 className="hidden md:flex text-2xl font-bold">
            {location.pathname == "/dashboard"
              ? "Dashboard"
              : location.pathname == "/users"
              ? "Users"
              : "No se sabe aún"}
          </h1>
        </div>
        <div className="flex items-center">
          <form className="hidden md:flex mr-3">
            <div className="relative">
              <FaSearch className="absolute left-2.5 top-2.5 h-5 w-5 text-gray-400" />
              <input
                className="pl-9 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                placeholder="Buscar tareas..."
                type="search"
              />
            </div>
          </form>
          <button className="flex text-gray-600 hover:text-gray-900">
            <IoNotificationsOutline className="h-6 w-6" />
          </button>
          <div>
            <button
              className="flex items-center ml-4 text-sm font-medium text-gray-700 hover:text-gray-900"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              <img
                src={usuario.profile_picture_url}
                className="rounded-full h-7 w-7"
              />
              <span className="mx-2">{usuario.name}</span>
              <FaChevronDown className="w-4 h-4 ml-1" />
            </button>
            {isUserMenuOpen && (
              <div
                ref={userMenuRef}
                className="absolute right-0 mt-2 w-48 z-30 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
              >
                <div
                  className="py-1"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu"
                >
                  <div
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    role="menuitem"
                    onClick={handleProfile}
                  >
                    Perfil
                  </div>
                  <div
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    role="menuitem"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    Configuración
                  </div>
                  <div
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    Cerrar sesión
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
