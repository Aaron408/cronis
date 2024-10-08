import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from 'react-toastify';
import axios from 'axios';

export default function VerificationCode() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
  const inputs = useRef([]);
  const timerRef = useRef(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const { nombre, email, password } = location.state || {};

  useEffect(() => {
    if (!email) {
      navigate("/");
    } else {
      startTimer();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [email, navigate]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(180);
    timerRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleChange = (index, value) => {
    if (value.length <= 1) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);

      if (value !== "" && index < 5) {
        inputs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && index > 0 && code[index] === "") {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const verificationCode = code.join("");
    if (verificationCode.length === 6) {
      setIsLoading(true);
      try {
        const response = await axios.post('http://localhost:5000/api/verify-code', {
          email,
          code: verificationCode
        });

        if (response.data.isValid) {
          const registerResponse = await axios.post('http://localhost:5000/api/register', {
            nombre,
            email,
            password
          });

          if (registerResponse.data.success) {
            toast.success('Usuario registrado exitosamente');
            navigate('/login');
          } else {
            toast.error('Error al registrar el usuario');
          }
        } else {
          toast.error('Código incorrecto');
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('Error al verificar el código');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      const response = await axios.post('http://localhost:5000/api/sendVerificationCode', { email });
      if (response.data.message) {
        toast.success('Código de verificación reenviado');
        setCode(["", "", "", "", "", ""]);
        inputs.current[0]?.focus();
        startTimer(); // Restart the timer when resending the code
      } else {
        toast.error('Error al reenviar el código');
      }
    } catch (error) {
      console.error('Error al reenviar el código:', error);
      toast.error('Error al reenviar el código');
    } finally {
      setIsResending(false);
    }
  };

  if (!email) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Verifica tu cuenta
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Ingresa el código de 6 dígitos que enviamos a tu correo electrónico.
        </p>
        <p className="mt-2 text-center text-sm font-medium text-gray-800">
          Tiempo restante: {formatTime(timeLeft)}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex justify-between">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputs.current[index] = el)}
                  type="text"
                  maxLength={1}
                  className="w-12 h-12 text-center text-2xl border-2 border-gray-300 rounded-md focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={isLoading || isResending || timeLeft === 0}
                />
              ))}
            </div>
            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                disabled={isLoading || isResending || timeLeft === 0}
              >
                {isLoading ? 'Verificando...' : 'Verificar'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  ¿No recibiste el código?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleResendCode}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                disabled={isLoading || isResending}
              >
                {isResending ? 'Reenviando...' : 'Reenviar código'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}