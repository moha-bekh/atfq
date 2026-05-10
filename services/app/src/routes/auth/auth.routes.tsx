import { Route } from "react-router-dom";
import { Register } from "@/pages/auth/Register";
import { Login } from "@/pages/auth/Login";
import { OAuthCallbackPage } from "@/pages/auth/OAuthCallbackPage";
import { GuestRoute } from "@/features/auth/components/GuestRoute";

export const authRoutes = (
  <>
    <Route element={<GuestRoute />}>
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
    </Route>
    <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
  </>
);
