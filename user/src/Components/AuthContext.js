import React, { createContext, useState, useContext } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("cronisUsuario");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = async (email, password, rememberMe) => {
    try {
      const response = await axios.post("http://localhost:5000/api/login", {
        email,
        password,
        rememberMe,
      });
      const { name, type, email: userEmail, token } = response.data;
      const userData = { name, type, email: userEmail, token };
      setUser(userData);
      localStorage.setItem("cronisUsuario", JSON.stringify(userData));
      toast.success("¡Inicio de sesión exitoso!");
      if (type === "1") {
        navigate("/home");
      } else if (type === "0") {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error during login:", error);
      if (error.response && error.response.status === 401) {
        toast.error("Credenciales incorrectas. Por favor, intente nuevamente.");
      } else {
        toast.error("Error al iniciar sesión. Por favor, intente nuevamente.");
      }
      throw error;
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("cronisUsuario");
    navigate("/");
    toast.success("Has cerrado sesión correctamente.");
  };

  const googleLogin = async (credentialResponse) => {
    try {
      if (!credentialResponse) {
        toast.error(
          "El inicio de sesión con Google falló. Credenciales no recibidas."
        );
        return;
      }

      const response = await axios.post(
        "http://localhost:5000/api/auth/google",
        { idToken: credentialResponse }
      );

      const { id, name, email, tipo, token } = response.data; // Extraer datos del usuario

      if (response.status === 200 || response.status === 201) {
        // Almacena los datos de usuario directamente desde response.data
        setUser(response.data); // Actualizar el estado
        localStorage.setItem("cronisUsuario", JSON.stringify(response.data)); // Guardar en localStorage

        toast.success("¡Bienvenido!");

        // Navegar dependiendo del tipo de usuario usando response.data.tipo en lugar de user.tipo
        if (tipo === "1") {
          navigate("/home");
        } else if (tipo === "0") {
          navigate("/dashboard");
        }
      }
    } catch (error) {
      console.error("Google login failed. Please try again.", error);
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

  if (allowedRoles && !allowedRoles.includes(user.type)) {
    const fallbackRedirect = roleRedirects[user.type] || redirectTo;
    return <Navigate to={fallbackRedirect} />;
  }

  return <Outlet />;
};
