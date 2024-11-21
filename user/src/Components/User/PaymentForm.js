/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import { toast } from "react-toastify";
import { FaStripe } from "react-icons/fa";
import { SuscriptionApi } from "../../api";
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

function PaymentForm({ onClose, onSuccess }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const stripe = useStripe();
  const elements = useElements();

  const handlePayment = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    if (!stripe || !elements) {
      setErrorMessage("Stripe no está completamente cargado.");
      setIsProcessing(false);
      return;
    }

    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) {
      setErrorMessage("No se pudo obtener el elemento de número de tarjeta.");
      setIsProcessing(false);
      return;
    }

    try {
      const amount = 119.99 * 100; // Convertir a centavos

      // Crear el intento de pago desde el backend
      const response = await SuscriptionApi.post("/api/create-payment", {
        amount: amount,
        currency: "mxn",
        paymentMethod: "card",
      });

      if (!response.data.clientSecret) {
        toast.error("No se pudo obtener el client secret.");
        return;
      }

      const { clientSecret } = response.data;

      // Confirmar el pago en el cliente
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardNumberElement,
          },
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      setSuccessMessage("Suscripción realizada exitosamente!");
      toast.success("Suscripción realizada exitosamente!");

      // Actualizar localStorage
      const userData = JSON.parse(
        localStorage.getItem("cronisUsuario") || "{}"
      );
      userData.suscription_plan = 2;
      localStorage.setItem("cronisUsuario", JSON.stringify(userData));

      // Llamar al callback de éxito
      onSuccess();

      // Cerrar el modal después de un corto retraso
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      if (
        error.response &&
        error.response.data.error ===
          "El usuario ya tiene una suscripción activa."
      ) {
        toast.warning("El usuario ya tiene una suscripción activa.");
      } else {
        setErrorMessage("No se completó la suscripción: " + error.message);
        toast.error("No se completó la suscripción");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handlePayment} className="space-y-6">
      <h2 className="text-xl font-semibold text-center text-gray-900 flex items-center justify-center space-x-2">
        <span>Procesar Pago con</span>
        <FaStripe className="text-black-500 text-5xl" />
      </h2>

      <div className="mb-6">
        <label
          htmlFor="cardNumber"
          className="block text-sm font-medium text-gray-700"
        >
          Número de tarjeta
        </label>
        <CardNumberElement
          id="cardNumber"
          className="mt-2 p-3 border rounded-lg shadow-sm w-full bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="expiry"
            className="block text-sm font-medium text-gray-700"
          >
            Fecha de expiración
          </label>
          <CardExpiryElement
            id="expiry"
            className="mt-2 p-3 border rounded-lg shadow-sm w-full bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="cvc"
            className="block text-sm font-medium text-gray-700"
          >
            CVC
          </label>
          <CardCvcElement
            id="cvc"
            className="mt-2 p-3 border rounded-lg shadow-sm w-full bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
      {successMessage && (
        <p className="text-green-500 text-sm">{successMessage}</p>
      )}

      <div className="flex justify-between space-x-4">
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className={`w-full px-6 py-3 rounded-lg text-white font-semibold transition-all duration-300 ease-in-out ${
            isProcessing
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-gray-800 to-black hover:from-gray-700 hover:to-gray-800 shadow-lg hover:shadow-xl"
          }`}
        >
          {isProcessing ? "Procesando..." : "Pagar"}
        </button>

        <button
          onClick={onClose}
          type="button"
          className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-red-500 to-red-700 text-white font-semibold transition-all duration-300 ease-in-out hover:from-red-600 hover:to-red-800 shadow-lg hover:shadow-xl"
        >
          Cerrar
        </button>
      </div>
    </form>
  );
}

export default PaymentForm;
