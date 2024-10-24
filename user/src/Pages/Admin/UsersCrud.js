import React, { useState, useContext, useEffect } from "react";
import Table, {
  AvatarCell,
  SelectColumnFilter,
  StatusPill,
} from "../../Components/Admin/Table";
import { UsersApi } from "../../api";

//Pages
import AdminHeader from "../../Components/Admin/AdminHeader";
import AdminSideBar from "../../Components/Admin/AdminSideBar";

import { FaPlus, FaPencilAlt, FaTrash, FaSearch } from "react-icons/fa";

const Users = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await UsersApi.get('/api/users');
        setUsers(response.data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    console.log(users);
  }, [users]);

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
      },
      {
        Header: "Estatus",
        accessor: "status",
        Cell: StatusPill,
      },
      {
        Header: "Rol",
        accessor: "role",
        Filter: SelectColumnFilter,
        filter: "includes",
      },
    ],
    []
  );

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSideBar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
      />

      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <AdminHeader toggleSidebar={toggleSidebar} />

        {/* Contenido */}
        <div className="p-6">
          {/* Tarjetitas info */}
          <Table columns={columns} data={users} />
        </div>
      </div>
    </div>
  );
};

export default Users;
