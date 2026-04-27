import { Route } from "react-router-dom";
import { Register } from "@/pages/auth/Register";
import { Login } from "@/pages/auth/Login";
import { OAuthCallbackPage } from "@/pages/auth/OAuthCallbackPage";

export const authRoutes = (
  <>
    <Route path="/register" element={<Register />} />
    <Route path="/login" element={<Login />} />
    <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
  </>
);
