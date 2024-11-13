import React, { useState, useEffect, useRef } from "react";
import Table, {
  AvatarCell,
  SelectColumnFilter,
  StatusPill,
} from "../../Components/Admin/Table";
import Select from "react-select";
import { UsersApi, ActivitiesApi } from "../../api";
import { toast } from "react-toastify";

//Pages
import AdminHeader from "../../Components/Admin/AdminHeader";
import AdminSideBar from "../../Components/Admin/AdminSideBar";

import { FaPencilAlt, FaTrash, FaCopy } from "react-icons/fa";

const customStyles = {
  control: (provided) => ({
    ...provided,
    border: "none",
    boxShadow: "none",
    "&:hover": {
      border: "none",
    },
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    color: "#999",
  }),
  indicatorSeparator: (provided) => ({
    ...provided,
    display: "none",
  }),
  menu: (provided) => ({
    ...provided,
    boxShadow: "none",
  }),
};

const Users = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [plans, setPlans] = useState([]);
  const [newName, setNewName] = useState("");
  const [newMail, setNewMail] = useState("");
  const [newPlan, setNewPlan] = useState("");
  const [newRol, setNewRol] = useState("");
  const [users, setUsers] = useState([]);
  const [subscriptionStartDate, setSubscriptionStartDate] = useState("");
  const [subscriptionEndDate, setSubscriptionEndDate] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [passwordModal, setPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [deleteModalIsOpen, setDeleteModalIsOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const modalRef = useRef(null);
  const deleteModalRef = useRef(null);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const fetchUsers = async () => {
    try {
      const response = await UsersApi.get("/api/users");
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await ActivitiesApi.get("/api/plans");
      setPlans(response.data);
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, []);

  useEffect(() => {
    console.log(users);
  }, [users]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        closeModal();
      }
      if (
        deleteModalRef.current &&
        !deleteModalRef.current.contains(event.target)
      ) {
        closeDeleteModal();
      }
    };

    if (modalIsOpen || deleteModalIsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [modalIsOpen, deleteModalIsOpen]);

  const statusOptions = [
    { value: "0", label: "Activo" },
    { value: "1", label: "Suspendido" },
  ];

  const rolOptions = [
    { value: "0", label: "Administrador" },
    { value: "1", label: "Usuario" },
  ];

  const planOptions = [
    { value: 1, label: "Gratuito" },
    { value: 2, label: "Premiun" },
  ];

  const columns = React.useMemo(
    () => [
      {
        Header: "Nombre",
        accessor: "name",
        Cell: AvatarCell,
        imgAccessor: "imgUrl",
        emailAccessor: "email",
      },
      {
        Header: "Plan",
        accessor: "suscription_plan",
        Cell: ({ value }) => {
          const plan = planOptions.find((p) => p.value === value);
          return plan ? plan.label : "N/A";
        },
        Filter: SelectColumnFilter,
        filter: "includes",
      },
      {
        Header: "Estatus",
        accessor: "status",
        Cell: ({ value }) => (
          <StatusPill
            value={
              statusOptions.find((option) => option.value === value)?.label ||
              "Desconocido"
            }
          />
        ),
      },
      {
        Header: "Rol",
        accessor: "rol",
        Cell: ({ value }) =>
          rolOptions.find((option) => option.value === value)?.label ||
          "Desconocido",
        Filter: SelectColumnFilter,
        filter: "includes",
      },
      {
        Header: "Registro",
        accessor: "register",
      },
      {
        Header: "Acciones",
        accessor: "id",
        Cell: ({ value, row }) => (
          <div className="flex justify-around">
            <button
              onClick={() => handleEdit(row.original)}
              className="text-blue-600 hover:text-blue-800"
            >
              <FaPencilAlt />
            </button>
            <button
              onClick={() => openDeleteModal(value)}
              className="text-red-600 hover:text-red-800"
            >
              <FaTrash />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const cleanQuiz = () => {
    setNewName("");
    setNewMail("");
    setNewPlan("");
    setNewRol("");
    setSubscriptionStartDate("");
    setSubscriptionEndDate("");
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setSelectedUser(null);
  };

  const openDeleteModal = (userId) => {
    setUserToDelete(userId);
    setDeleteModalIsOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalIsOpen(false);
    setUserToDelete(null);
  };

  const handleDelete = async () => {
    try {
      await UsersApi.post("/api/deleteUser", {
        userId: userToDelete,
      });
      toast.success("Usuario eliminado exitosamente!");
      closeDeleteModal();
      fetchUsers();
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      toast.error("Error al eliminar usuario");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneratedPassword("");
    setPasswordModal(false);

    if (
      newName === "" ||
      newMail === "" ||
      (newRol.value !== "1" && newPlan === "")
    ) {
      return toast.error("Llena correctamente el formulario");
    }

    if (newPlan.value === 2) {
      if (!subscriptionStartDate || !subscriptionEndDate) {
        return toast.error(
          "Las fechas de inicio y fin de suscripción son obligatorias para el plan premium"
        );
      }
    }

    try {
      const response = await UsersApi.post("/api/addUser", {
        name: newName,
        email: newMail,
        type: newRol.value,
        suscription_plan: newRol.value === "1" ? null : newPlan.value,
        subscription_start_date:
          newPlan.value === 2 ? subscriptionStartDate : null,
        subscription_end_date: newPlan.value === 2 ? subscriptionEndDate : null,
      });
      toast.success(response.data.message);
      setGeneratedPassword(response.data.password);
      setPasswordModal(true);
      fetchUsers();
      cleanQuiz();
    } catch (error) {
      console.error("Error al agregar usuario:", error);
      toast.error("Error al agregar usuario");
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await UsersApi.post("/api/updateUserCRUD", {
        selectedUser,
      });
      toast.success("Usuario actualizado exitosamente!");
      setModalIsOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      toast.error("Error al actualizar usuario");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast.success("Contraseña copiada al portapapeles");
      },
      (err) => {
        console.error("Error al copiar: ", err);
        toast.error("Error al copiar la contraseña");
      }
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSideBar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
      />

      <div className="flex-1 overflow-y-auto">
        <AdminHeader toggleSidebar={toggleSidebar} />

        <div className="p-6">
          {/* Formulario para añadir usuarios */}
          <div>
            <h1 className="mb-5 text-3xl font-bold">Agregar Usuarios</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 mt-3">
              <div>
                <h1 className="pl-1">Nombre: </h1>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Escribe el valor"
                  type="text"
                  className="mt-2 py-2 px-3 border-none shadow-none rounded-lg focus:ring-2 focus:ring-blue-300 focus:outline-none w-full"
                />
              </div>
              <div>
                <h1 className="pl-1">Correo: </h1>
                <input
                  value={newMail}
                  onChange={(e) => setNewMail(e.target.value)}
                  placeholder="Escribe el valor"
                  type="text"
                  className="mt-2 py-2 px-3 border-none shadow-none rounded-lg focus:ring-2 focus:ring-blue-300 focus:outline-none w-full"
                />
              </div>
              <div>
                <h1 className="pl-1">Rol: </h1>
                <Select
                  value={newRol}
                  onChange={(selectedOption) => {
                    setNewRol(selectedOption);
                  }}
                  className="flex-1"
                  styles={customStyles}
                  options={[
                    { id: "1", name: "Administrador" },
                    { id: "2", name: "Usuario" },
                  ].map((rol) => ({
                    value: rol.id,
                    label: rol.name,
                  }))}
                  placeholder="Administrador/Usuario"
                />
              </div>
              <div>
                <h1 className="pl-1">Plan: </h1>
                <Select
                  value={newRol.value === "2" ? newPlan : null}
                  onChange={(selectedOption) => {
                    setNewPlan(selectedOption);
                  }}
                  className="flex-1"
                  styles={customStyles}
                  options={planOptions.map((plan) => ({
                    value: plan.value,
                    label: plan.label,
                  }))}
                  placeholder={
                    newRol.value === "2" ? "Seleccione un plan" : "N/A"
                  }
                  isDisabled={newRol.value === "2" ? false : true}
                />
              </div>
              {newPlan.value == "2" && (
                <>
                  <div>
                    <h1 className="pl-1">Fecha de inicio de suscripción: </h1>
                    <input
                      type="date"
                      value={subscriptionStartDate}
                      onChange={(e) => setSubscriptionStartDate(e.target.value)}
                      className="mt-2 py-2 px-3 border-none shadow-none rounded-lg focus:ring-2 focus:ring-blue-300 focus:outline-none w-full"
                    />
                  </div>
                  <div>
                    <h1 className="pl-1">Fecha de fin de suscripción: </h1>
                    <input
                      type="date"
                      value={subscriptionEndDate}
                      onChange={(e) => setSubscriptionEndDate(e.target.value)}
                      className="mt-2 py-2 px-3 border-none shadow-none rounded-lg focus:ring-2 focus:ring-blue-300 focus:outline-none w-full"
                    />
                  </div>
                </>
              )}
            </div>
            <button
              className="mb-5 self-start bg-black hover:bg-gray-800 text-white font-bold py-2 px-4 rounded w-full sm:w-auto"
              onClick={handleSubmit}
            >
              Agregar Valor
            </button>
            {passwordModal && (
              <div className="mb-5 p-4 bg-green-100 rounded-lg z-50">
                <p className="font-semibold">Contraseña generada:</p>
                <div className="flex items-center mt-2">
                  <input
                    type="text"
                    value={generatedPassword}
                    readOnly
                    className="flex-grow mr-2 p-2 border rounded"
                  />
                  <button
                    onClick={() => copyToClipboard(generatedPassword)}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    <FaCopy />
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Edit User Modal */}
          {modalIsOpen && selectedUser && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
              <div
                ref={modalRef}
                className="relative p-5 md:p-8 border w-full md:w-[55%] shadow-lg rounded-lg bg-white"
              >
                <div className="text-center">
                  <h3 className="text-xl leading-6 font-bold text-gray-900 mb-4">
                    Editar Usuario
                  </h3>
                  <form onSubmit={handleUpdateUser} className="mt-2 text-left">
                    <div className="mb-4">
                      <label
                        className="block text-gray-700 text-sm font-bold mb-2"
                        htmlFor="name"
                      >
                        Nombre
                      </label>
                      <input
                        className="py-2 px-3 bg-gray-200 text-gray-400 shadow-none rounded-lg focus:outline-none w-full"
                        id="name"
                        type="text"
                        value={selectedUser.name}
                        disabled={true}
                      />
                    </div>
                    <div className="mb-4">
                      <label
                        className="block text-gray-700 text-sm font-bold mb-2"
                        htmlFor="email"
                      >
                        Email
                      </label>
                      <input
                        className="py-2 px-3 bg-gray-200 text-gray-400 shadow-none rounded-lg focus:outline-none w-full"
                        id="email"
                        type="email"
                        value={selectedUser.email}
                        disabled={true}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:gap-4">
                      <div className="mb-4 sm:w-1/2">
                        <label
                          className="block text-gray-700 text-sm font-bold mb-2"
                          htmlFor="plan"
                        >
                          Plan
                        </label>
                        <Select
                          value={planOptions.find(
                            (option) =>
                              option.value === selectedUser.suscription_plan
                          )}
                          onChange={(selectedOption) =>
                            setSelectedUser({
                              ...selectedUser,
                              suscription_plan: selectedOption.value,
                            })
                          }
                          options={planOptions}
                          styles={customStyles}
                          className="border border-2 rounded-lg"
                        />
                      </div>
                      <div className="mb-4 sm:w-1/2">
                        <label
                          className="block text-gray-700 text-sm font-bold mb-2"
                          htmlFor="status"
                        >
                          Estatus
                        </label>
                        <Select
                          value={{
                            value: selectedUser.status,
                            label:
                              selectedUser.status === "1"
                                ? "Suspendido"
                                : "Activo",
                          }}
                          onChange={(selectedOption) =>
                            setSelectedUser({
                              ...selectedUser,
                              status: selectedOption.value,
                            })
                          }
                          options={statusOptions}
                          styles={customStyles}
                          className="border border-2 rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label
                        className="block text-gray-700 text-sm font-bold mb-2"
                        htmlFor="rol"
                      >
                        Rol
                      </label>
                      <Select
                        value={{
                          value: selectedUser.rol,
                          label:
                            selectedUser.rol === "0"
                              ? "Administrador"
                              : "Usuario",
                        }}
                        onChange={(selectedOption) =>
                          setSelectedUser({
                            ...selectedUser,
                            rol: selectedOption.value,
                          })
                        }
                        options={rolOptions}
                        styles={customStyles}
                        className="border border-2 rounded-lg"
                      />
                    </div>
                    <div className="flex items-center justify-between sm:justify-end sm:gap-6 mt-6">
                      <button
                        className="bg-black hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline"
                        type="submit"
                      >
                        Guardar Cambios
                      </button>
                      <button
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline"
                        type="button"
                        onClick={closeModal}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
          {/* Delete Confirmation Modal */}
          {deleteModalIsOpen && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
              <div
                ref={deleteModalRef}
                className="relative p-5 sm:p-8 border w-[90%] sm:w-[42%] lg:w-[25%] shadow-lg rounded-lg bg-white"
              >
                <div className="text-center">
                  <h3 className="text-xl leading-6 font-bold text-gray-900 mb-4">
                    ¿Estás seguro de eliminar este usuario?
                  </h3>
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline"
                    >
                      Aceptar
                    </button>
                    <button
                      onClick={closeDeleteModal}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <Table columns={columns} data={users} />
        </div>
      </div>
    </div>
  );
};

export default Users;
