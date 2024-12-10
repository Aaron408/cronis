/* eslint-disable jsx-a11y/alt-text */
import React, { useEffect, useState, useRef, useContext } from "react";
import { AuthContext } from "../AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

import { FaChevronDown } from "react-icons/fa";
import { IoSearch } from "react-icons/io5";
import { HiMenu } from "react-icons/hi";
import { UsersApi } from "../../api";
import { toast } from "react-toastify";

const sections = [
  { id: 1, title: "Dashboard", path: "/dashboard" },
  { id: 2, title: "Usuarios", path: "/users" },
  { id: 3, title: "Reportes", path: "/reports" },
  { id: 4, title: "Perfil", path: "/profile" },
];

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
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

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

  const handleSearchResultClick = (result) => {
    setSearchTerm("");
    navigate(result.path);
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
            {location.pathname === "/dashboard"
              ? "Dashboard"
              : location.pathname === "/users"
              ? "Users"
              : location.pathname === "/reports"
              ? "Reports"
              : "No se sabe aún"}
          </h1>
        </div>
        <div className="flex items-center">
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
