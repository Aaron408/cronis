import React, {useContext} from "react";
import { Routes, Route, Navigate } from "react-router-dom";

//Pages
import Login from "./Pages/Login";
import Home from "./Pages/Users/Home";
import SingIn from "./Pages/SingIn";

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
      </Route>
    </Routes>
  );
};

export default Navigation;
