import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { authRoutes } from "./auth/auth.routes";
import { Home } from "@/pages/Home";
import { About } from "@/pages/About";
import ProfilePage from "@/pages/user/Profile";
import DashboardPage from "@/pages/admin/Dashboard";
import WikiPage from "@/features/wiki/pages/WikiPage";
import { PrivacyPage, TermsPage } from "@/pages/legal/LegalPages";
import { NotFound } from "@/pages/NotFound";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/wiki" element={<WikiPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>

        <Route element={<AuthLayout />}>
          {authRoutes}
        </Route>
      </Routes>
    </BrowserRouter >
  );
}
