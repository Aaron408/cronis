/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";

export default function ActivityModal({
  isOpen,
  onClose,
  onSave,
  editingEvent,
}) {
  const initialEventState = {
    title: "",
    description: "",
    importance: "0",
    status: "0",
    start_date: new Date().toISOString().split("T")[0],
    due_date: new Date().toISOString().split("T")[0],
    type: "Recurrente",
    date: new Date().toISOString().split("T")[0],
    start_time: "",
    end_time: "",
  };

  const [event, setEvent] = useState(initialEventState);

  const modalRef = useRef(null);

  useEffect(() => {
    if (editingEvent) {
      setEvent(editingEvent);
    } else {
      setEvent(initialEventState);
    }
  }, [editingEvent, isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEvent((prev) => ({ ...prev, [name]: value }));
  };

  const normalizeDate = (date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  const validateDates = () => {
    const today = normalizeDate(new Date());
    today.setHours(0, 0, 0, 0);

    // Determinar fechas según el tipo de evento
    let eventDate;
    let dueDate;

    if (event.type === "Puntual") {
      eventDate = normalizeDate(event.date);
      dueDate = normalizeDate(event.date);
    } else {
      eventDate = normalizeDate(event.start_date);
      dueDate = normalizeDate(event.due_date);

      // Validar que las fechas no sean anteriores a hoy
      if (eventDate < today) {
        toast.error("La fecha de inicio no puede ser anterior al día actual.");
        return false;
      }
      if (dueDate < today) {
        toast.error("La fecha de entrega no puede ser anterior al día actual.");
        return false;
      }
    }

    // Validar que la fecha de entrega no sea anterior a la de inicio para eventos recurrentes
    if (event.type === "Recurrente" && dueDate < eventDate) {
      toast.error(
        "La fecha de entrega no puede ser anterior a la fecha de inicio."
      );
      return false;
    }

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateDates()) {
      onSave(event);
      setEvent(initialEventState);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 overflow-auto">
      <div
        className="bg-white p-6 rounded-lg w-96 md:w-[50%] max-h-[90vh] overflow-y-auto"
        ref={modalRef}
      >
        <h2 className="text-2xl font-bold mb-4">
          {editingEvent ? "Editar Actividad" : "Agregar Actividad"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-md font-semibold mb-2">
              Título
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={event.title}
              onChange={handleChange}
              className="border-gray-300 shadow-sm w-full px-4 py-2 border rounded-md"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="description"
              className="block text-md font-semibold mb-2"
            >
              Descripción
            </label>
            <textarea
              id="description"
              name="description"
              value={event.description}
              onChange={handleChange}
              className="border-gray-300 shadow-sm w-full px-4 py-2 border rounded-md"
              rows={3}
              required
            ></textarea>
          </div>
          <div className="mb-4">
            <label htmlFor="type" className="block text-md font-semibold mb-2">
              Tipo de actividad
            </label>
            <select
              id="type"
              name="type"
              value={event.type}
              onChange={handleChange}
              className="border-gray-300 shadow-sm w-full px-4 py-2 border rounded-md"
              required
            >
              <option value="Puntual">Puntual</option>
              <option value="Recurrente">Recurrente</option>
            </select>
          </div>
          {event.type === "Puntual" && (
            <>
              <div className="mb-4">
                <label
                  htmlFor="date"
                  className="block text-md font-semibold mb-2"
                >
                  Fecha
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={event.date}
                  onChange={handleChange}
                  min={new Date().toISOString().split("T")[0]}
                  className="border-gray-300 shadow-sm w-full px-4 py-2 border rounded-md"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:mb-5">
                  <label
                    htmlFor="start_time"
                    className="block text-md font-semibold mb-2"
                  >
                    Hora de inicio
                  </label>
                  <input
                    type="time"
                    id="start_time"
                    name="start_time"
                    value={event.start_time}
                    onChange={handleChange}
                    className="border-gray-300 shadow-sm w-full px-4 py-2 border rounded-md"
                    required
                  />
                </div>
                <div className="md:mb-8">
                  <label
                    htmlFor="end_time"
                    className="block text-md font-semibold mb-2"
                  >
                    Hora de fin
                  </label>
                  <input
                    type="time"
                    id="end_time"
                    name="end_time"
                    value={event.end_time}
                    onChange={handleChange}
                    className="border-gray-300 shadow-sm w-full px-4 py-2 border rounded-md"
                    required
                  />
                </div>
              </div>
            </>
          )}
          {event.type !== "Puntual" && (
            <>
              <div className="mb-4">
                <label
                  htmlFor="importance"
                  className="block text-md font-semibold mb-2"
                >
                  Importancia
                </label>
                <select
                  id="importance"
                  name="importance"
                  value={event.importance}
                  onChange={handleChange}
                  className="border-gray-300 shadow-sm w-full px-4 py-2 border rounded-md"
                  required
                >
                  <option value="0">Baja</option>
                  <option value="1">Media</option>
                  <option value="2">Alta</option>
                </select>
              </div>
              <div className="mb-4">
                <label
                  htmlFor="start_date"
                  className="block text-md font-semibold mb-2"
                >
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={event.start_date}
                  onChange={handleChange}
                  min={new Date().toISOString().split("T")[0]}
                  className="border-gray-300 shadow-sm w-full px-4 py-2 border rounded-md"
                  required
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="due_date"
                  className="block text-md font-semibold mb-2"
                >
                  Fecha de entrega
                </label>
                <input
                  type="date"
                  id="due_date"
                  name="due_date"
                  value={event.due_date}
                  onChange={handleChange}
                  min={event.start_date}
                  className="border-gray-300 shadow-sm w-full px-4 py-2 border rounded-md"
                  required
                />
              </div>
            </>
          )}
          <div className="flex justify-end space-x-3 mt-8 md:mt-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                setEvent(initialEventState);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
            >
              {editingEvent ? "Guardar cambios" : "Agregar actividad"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
