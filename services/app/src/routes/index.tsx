import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { authRoutes } from "./auth/auth.routes";
import { Home } from "@/pages/Home";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/wiki" element={<div>Wiki</div>} />

          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<div>Profile</div>} />
          </Route>
        </Route>

        <Route element={<AuthLayout />}>
          {authRoutes}
        </Route>

        <Route path="*" element={<div>404</div>} />
      </Routes>
    </BrowserRouter >
  );
}
