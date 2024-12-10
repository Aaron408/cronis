import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AuthApi } from "../api";
import { FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { MdMailOutline } from "react-icons/md";

const PasswordRecovery = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  useEffect(() => {
    validatePassword(newPassword);
  }, [newPassword]);

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

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await AuthApi.post("/api/send-recovery-code", { email });
      toast.success("Código de recuperación enviado a tu correo");
      setStep(2);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        toast.error("Usuario no encontrado");
      } else {
        toast.error("Error al enviar el código de recuperación");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const verificationCode = code.join("");
      const response = await AuthApi.post("/api/verify-recovery-code", {
        email,
        code: verificationCode,
      });
      if (response.data.isValid) {
        toast.success("Código valido");
        setTempToken(response.data.tempToken);
        setStep(3);
      } else {
        toast.error("Código inválido");
      }
    } catch (error) {
      toast.error("Error al verificar el código");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) {
      toast.error("La contraseña no cumple con los requisitos de seguridad");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setIsLoading(true);
    try {
      await AuthApi.post("/api/reset-password", {
        email,
        password: newPassword,
        tempToken,
      });
      toast.success("Contraseña actualizada exitosamente");
      navigate("/login");
    } catch (error) {
      if (error.response && error.response.status === 400) {
        toast.error(
          "Token inválido o expirado. Por favor, inicie el proceso nuevamente."
        );
        setStep(1);
      } else {
        toast.error("Error al actualizar la contraseña");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index, value) => {
    if (value.length <= 1) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);
      if (value !== "" && index < 5) {
        document.getElementById(`code-${index + 1}`).focus();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Recuperar contraseña
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {step === 1 && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Correo electrónico
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
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300 pl-10"
                    placeholder="tu@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none"
                >
                  {isLoading ? "Enviando..." : "Enviar código de recuperación"}
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleCodeSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-gray-700"
                >
                  Código de verificación
                </label>
                <div className="mt-1 flex justify-between">
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      id={`code-${index}`}
                      type="text"
                      maxLength={1}
                      className="w-12 h-12 text-center text-2xl border-2 border-gray-300 rounded-md focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none"
                >
                  {isLoading ? "Verificando..." : "Verificar código"}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nueva contraseña
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </div>
                  <input
                    id="new-password"
                    name="new-password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300 pl-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Confirmar nueva contraseña
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </div>
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300 pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isLoading || !isPasswordValid}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Actualizando..." : "Actualizar contraseña"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PasswordRecovery;
