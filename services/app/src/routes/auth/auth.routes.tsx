import { Route } from "react-router-dom";
import { Register } from "@/pages/auth/Register";
import { Login } from "@/pages/auth/Login";

export const authRoutes = (
  <>
    <Route path="/register" element={<Register />} />
    <Route path="/login" element={<Login />} />
  </>
);
