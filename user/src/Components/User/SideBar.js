import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaCalendarAlt,
  FaHistory,
  FaClipboardList,
  FaRocket,
} from "react-icons/fa";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import PaymentForm from "./PaymentForm";

// Cargar Stripe
const stripePromise = loadStripe(
  "pk_test_51PYVslEiF5HRSVLEJJOJvWf7vgZ9hySra9DrYuU3YDDVF34bxdLHuFPva1ezYyNT3XKoxixIdFF43dLryOzmb2rG00bDtVdmLr"
);

function SideBar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState(null);
  const modalRef = useRef(null);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("cronisUsuario") || "{}");
    setSubscriptionPlan(userData.suscription_plan || null);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        closeModal();
      }
    };

    if (isModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isModalOpen]);

  const handleSuccessfulPayment = () => {
    const userData = JSON.parse(localStorage.getItem("cronisUsuario"));
    userData.suscription_plan = 2;
    localStorage.setItem("cronisUsuario", JSON.stringify(userData));
    setSubscriptionPlan(2);
    closeModal();
  };

  return (
    <Elements stripe={stripePromise}>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        ></div>
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r transition-transform duration-300 ease-in-out transform ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } sm:relative sm:translate-x-0`}
      >
        <div className="h-full flex flex-col justify-between">
          <div className="space-y-2 py-2 px-4">
            <div>
              <h2 className="mb-2 text-lg font-semibold text-gray-800">
                Navegación
              </h2>
              <button
                onClick={() =>
                  location.pathname !== "/home" && navigate("/home")
                }
                className="w-full flex items-center text-left px-4 py-3 text-sm font-medium text-gray-900 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <FaCalendarAlt className="inline-block mr-3 h-5 w-5" />
                <span>Agenda</span>
              </button>
            </div>
            <hr className="border-gray-200" />
            <div>
              <h2 className="mb-2 text-lg font-semibold text-gray-800">
                Proyectos
              </h2>
              <div className="">
                <button
                  onClick={() => navigate("/activities")}
                  className="w-full flex items-center text-left px-4 py-3 text-sm font-medium text-gray-900 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <FaClipboardList className="inline-block mr-3 h-5 w-5" />
                  <span>Activas</span>
                </button>
                <button
                  onClick={() => navigate("/history")}
                  className="w-full flex items-center text-left px-4 py-3 text-sm font-medium text-gray-900 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <FaHistory className="inline-block mr-3 h-5 w-5" />
                  <span>Historial</span>
                </button>
              </div>
            </div>
          </div>
          <div className="px-4 pb-6">
            {subscriptionPlan === 2 ? (
              <button
                disabled
                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg shadow-lg cursor-default flex items-center justify-center"
              >
                <FaRocket className="inline-block mr-3 h-5 w-5" />
                <span>Plan Pro Activo</span>
              </button>
            ) : (
              <button
                onClick={openModal}
                className="w-full px-6 py-3 bg-gradient-to-r from-gray-800 to-black text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:from-gray-600 hover:to-gray-600 transition-all duration-300 ease-in-out"
              >
                <FaRocket className="inline-block mr-3 h-5 w-5" />
                <span>Conseguir Pro</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div
            ref={modalRef}
            className="bg-white p-8 rounded-lg shadow-lg max-w-5xl w-full relative flex"
          >
            <div className="flex-1 pr-6 bg-gradient-to-r from-green-100 to-blue-100 p-6 rounded-lg shadow-lg">
              <h3 className="text-2xl font-semibold mb-6 text-gray-800">
                Beneficios de conseguir Pro:
              </h3>
              <ul className="space-y-4 text-gray-700 list-disc pl-6">
                <li className="text-lg">Por solo $119.99/mes.</li>
                <li className="text-lg">Acceso a más actividades.</li>
                <li className="text-lg">Mejor rendimiento y velocidad.</li>
                <li className="text-lg">Soporte técnico prioritario.</li>
                <li className="text-lg">Límite de actividades aumentado.</li>
              </ul>
            </div>

            <div className="border-l border-gray-300 mx-6"></div>

            <div className="flex-1 pl-6">
              <PaymentForm
                onClose={closeModal}
                onSuccess={handleSuccessfulPayment}
              />
            </div>
          </div>
        </div>
      )}
    </Elements>
  );
}

export default SideBar;
