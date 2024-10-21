/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect, useRef, useContext } from "react";
import { AuthContext } from "../Components/AuthContext";
import { useNavigate } from "react-router-dom";

import { FaUser } from "react-icons/fa";
import { HiMenu } from "react-icons/hi";
import { IoSearch } from "react-icons/io5";
import { IoNotificationsOutline } from "react-icons/io5";

const Header = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

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

  const handleMenuOptionClick = () => {
    setIsUserMenuOpen(false);
  };
  
  const handleProfile = () => {
    navigate("/profile");
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={onToggleSidebar}
          className="text-gray-600 hover:text-gray-900 md:hidden"
        >
          <HiMenu className="h-7 w-7 mt-1" />
        </button>
        <h1 className="hidden md:flex text-2xl font-bold">Mi Agenda</h1>
      </div>
      <div className="flex items-center space-x-4">
        <form className="hidden md:flex">
          <div className="relative">
            <IoSearch className="absolute left-2.5 top-2.5 h-5 w-5 text-gray-500" />
            <input
              className="pl-9 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              placeholder="Buscar tareas..."
              type="search"
            />
          </div>
        </form>
        <button className="hidden md:flex text-gray-600 hover:text-gray-900">
          <IoNotificationsOutline className="h-6 w-6" />
        </button>
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="text-gray-600 hover:text-gray-900 focus:outline-none"
          >
            <FaUser className="h-6 w-5 mt-1" />
          </button>
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 z-30 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
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
                  onClick={handleMenuOptionClick}
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
    </header>
  );
};

export default Header;
