import React, { createContext, useState, useContext } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode"; // Asegúrate de usar la importación con nombre

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    try {
      const response = await axios.post("/api/login", { email, password });
      setUser(response.data.user);
      toast.success("Login successful!");
      navigate("/home");
    } catch (error) {
      toast.error("Login failed. Please try again.");
    }
  };

  const logout = async () => {
    try {
      await axios.post("/api/logout");
      setUser(null);
      navigate("/");
    } catch (error) {
      toast.error("Logout failed. Please try again.");
    }
  };

  const googleLogin = async (credentialResponse) => {
    try {
      // Envía el token recibido a tu backend para que lo verifique
      const response = await axios.post("/api/auth/google", {
        idToken: credentialResponse.credential, // Usa el token ID recibido de Google
      });

      // Solo muestra en consola la respuesta recibida
      console.log(response.data); // Esto mostrará lo que recibiste del backend

      // Si la respuesta indica que el usuario fue creado o encontrado, actualiza el estado
      if (response.data.user) {
        const decodedUser = jwtDecode(response.data.token);
        setUser(decodedUser); // Asumiendo que el token tiene la información del usuario
        toast.success("Login successful!");
        navigate("/home");
      } else {
        toast.error("Error during login, please try again.");
      }
    } catch (error) {
      toast.error("Google login failed. Please try again.");
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, googleLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const PrivateRoute = ({
  allowedRoles,
  redirectTo = "/",
  roleRedirects = {},
}) => {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to={redirectTo} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.tipo)) {
    const fallbackRedirect = roleRedirects[user.tipo] || redirectTo;
    return <Navigate to={fallbackRedirect} />;
  }

  return <Outlet />;
};
