import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

//Pages
import Login from "./Pages/Login";

const Navigation = () => {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
    </Routes>
  );
};

export default Navigation;
