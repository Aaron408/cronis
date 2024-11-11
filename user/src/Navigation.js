import React, {useContext} from "react";
import { Routes, Route, Navigate } from "react-router-dom";

//User Pages
import Login from "./Pages/Login";
import SingIn from "./Pages/SingIn";
import Home from "./Pages/Users/Home";
import Activities from "./Pages/Users/Activities";
import Profile from "./Pages/Users/Profile";

//Admin Pages
import Dashboard from "./Pages/Admin/Dashboard";
import Users from "./Pages/Admin/UsersCrud";

import { AuthContext } from "./Components/AuthContext";
import { PrivateRoute } from "./Components/AuthContext";
import VerificationCode from "./Pages/Verification";

const Navigation = () => {
  const { user } = useContext(AuthContext);
  
  // Redirección específica según el tipo de usuario
  const roleRedirects = {
    "0": "/dashboard",
    "1": "/home",
  };

  return (
    <Routes>
      <Route path="*" element={<h1>Tas perdido o k?</h1>} />
      <Route path="/" element={user ? <Navigate to={roleRedirects[user.type] || "/"} /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={roleRedirects[user.type] || "/"} /> : <SingIn />} />
      <Route path="/login" element={user ? <Navigate to={roleRedirects[user.type] || "/"} /> : <Login />} />
      <Route path="/verification" element={user ? <Navigate to={roleRedirects[user.type] || "/"} /> : <VerificationCode />} />
      <Route element={<PrivateRoute allowedRoles={["1"]} roleRedirects={roleRedirects} />}>
        <Route path="/home" element={<Home />} />
        <Route path="/activities" element={<Activities />} />
      </Route>
      <Route element={<PrivateRoute allowedRoles={["1", "0"]} roleRedirects={roleRedirects} />}>
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route element={<PrivateRoute allowedRoles={["0"]} roleRedirects={roleRedirects} />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
      </Route>
    </Routes>
  );
};

export default Navigation;
