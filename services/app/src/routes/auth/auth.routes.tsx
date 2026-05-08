import { Route } from "react-router-dom";
import { Register } from "@/pages/auth/Register";
import { Login } from "@/pages/auth/Login";
import { OAuthCallbackPage } from "@/pages/auth/OAuthCallbackPage";
import { PasswordReset } from "@/pages/auth/PasswordReset";
import { GuestRoute } from "@/features/auth/components/GuestRoute";

export const authRoutes = (
  <>
    <Route element={<GuestRoute />}>
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/password-reset" element={<PasswordReset />} />
    </Route>
    <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
  </>
);
