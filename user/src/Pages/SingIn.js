import React, { useState, useEffect } from "react";
import { FaEye, FaEyeSlash, FaLock } from "react-icons/fa";
import { MdMailOutline } from "react-icons/md";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { AuthApi } from "../api";

export default function SignUp() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastNameP, setLastNameP] = useState("");
  const [lastNameM, setLastNameM] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  useEffect(() => {
    validatePassword(password);
  }, [password]);

  const validatePassword = (password) => {
    setPasswordStrength({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  };

  const isPasswordValid = Object.values(passwordStrength).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar campos requeridos
    if (
      !firstName ||
      !lastNameP ||
      !email ||
      !password ||
      !passwordConfirmation
    ) {
      toast.error("Llena correctamente el formulario.");
      return;
    }

    if (!isPasswordValid) {
      toast.error("La contraseña no cumple con los requisitos de seguridad.");
      return;
    }

    // Validar contraseñas coincidentes
    if (password !== passwordConfirmation) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    // Validar formato de correo (solo Gmail, Hotmail e institucionales de la UTEQ)
    const emailRegex =
      /^[a-zA-Z0-9._%+-]+@(gmail\.com|hotmail\.com|uteq.edu.mx)$/;
    if (!emailRegex.test(email)) {
      toast.error(
        "El correo debe ser una cuenta válida de Gmail, Hotmail o uteq.edu.mx."
      );
      return;
    }

    try {
      // Verificar si ya existe una cuenta con el correo proporcionado
      const checkUserResponse = await AuthApi.get(
        `/api/checkEmail?email=${encodeURIComponent(email)}`
      );

      if (checkUserResponse.data.exists) {
        // Si ya existe una cuenta con este correo se avisa y se detiene el proceso
        toast.error("Ya existe una cuenta con este correo electrónico.");
        return;
      }

      // Si no existe una cuenta se envía el código de verificación para la creación de una.
      const response = await AuthApi.post("/api/sendVerificationCode", {
        email,
      });

      if (response.status === 200) {
        toast.success("El código de verificación ha sido enviado a tu correo.");
        const nombre = `${firstName} ${lastNameP} ${lastNameM}`;

        navigate("/verification", {
          state: { nombre, email, password },
        });
      } else {
        toast.error(
          response.data.message ||
            "Hubo un error al enviar el código de verificación."
        );
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      toast.error("Error de conexión. Inténtalo nuevamente.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Regístrate en Cronis
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700"
              >
                Nombre <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
                  placeholder="Escribe tu nombre"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="lastNameP"
                className="block text-sm font-medium text-gray-700"
              >
                Apellido Paterno <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="lastNameP"
                  name="lastNameP"
                  type="text"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
                  placeholder="Escribe tu apellido"
                  value={lastNameP}
                  onChange={(e) => setLastNameP(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="lastNameM"
                className="block text-sm font-medium text-gray-700"
              >
                Apellido Materno
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="lastNameM"
                  name="lastNameM"
                  type="text"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
                  placeholder="Escribe tu apellido"
                  value={lastNameM}
                  onChange={(e) => setLastNameM(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Correo electrónico <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MdMailOutline
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </div>
                <input
                  id="email"
                  name="email"
                  type="text"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300 pl-10"
                  placeholder="tu@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Contraseña <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300 pl-10"
                  placeholder="•••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <FaEyeSlash className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <FaEye className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
              <div className="mt-2 text-sm">
                <p
                  className={
                    passwordStrength.minLength
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  ✓ Mínimo 8 caracteres
                </p>
                <p
                  className={
                    passwordStrength.hasUppercase
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  ✓ Al menos una mayúscula
                </p>
                <p
                  className={
                    passwordStrength.hasLowercase
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  ✓ Al menos una minúscula
                </p>
                <p
                  className={
                    passwordStrength.hasNumber
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  ✓ Al menos un número
                </p>
                <p
                  className={
                    passwordStrength.hasSpecialChar
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  ✓ Al menos un carácter especial
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="passwordConfirmation"
                className="block text-sm font-medium text-gray-700"
              >
                Confirma tu contraseña <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </div>
                <input
                  id="passwordConfirmation"
                  name="passwordConfirmation"
                  type={showPassword ? "text" : "password"}
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300 pl-10"
                  placeholder="•••••••••••"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 mt-8 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none"
              >
                Registrar
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 text-end">
              ¿Ya tienes una cuenta?{" "}
              <Link
                to="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
