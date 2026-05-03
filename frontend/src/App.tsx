import { UpOutlined } from "@ant-design/icons";
import { ConfigProvider, FloatButton, Spin, theme } from "antd";
import type { ThemeConfig } from "antd";
import ruRU from "antd/locale/ru_RU";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";

import "./App.css";
import { useAuthStore } from "./store/authStore";
import Footer from "./components/Footer";
import Header from "./components/Header/Header";
import AdminRoute from "./components/routes/AdminRoute";
import PrivateRoute from "./components/routes/PrivateRoute";
import HomePage from "./pages/HomePage";

const AboutPage = lazy(() => import("./pages/AboutPage"));
const AdminPages = lazy(() => import("./pages/AdminPages"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const EventDetailPage = lazy(() => import("./pages/EventDetailPage"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const OfferPage = lazy(() => import("./pages/OfferPage"));
const PaymentReturnPage = lazy(() => import("./pages/PaymentReturnPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const VkAuthCallbackPage = lazy(() => import("./pages/VkAuthCallbackPage"));

const appTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: "#b83232",
    colorLink: "#b83232",
    colorLinkHover: "#942828",
    borderRadius: 10,
    fontFamily:
      "'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
  },
  components: {
    Button: {
      primaryShadow: "0 4px 12px rgba(184, 50, 50, 0.25)",
    },
  },
};

function LegacyEventBookingRedirect() {
  const [params] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const sid = params.get("scheduleId");
  if (sid && /^\d+$/.test(sid)) {
    return <Navigate to={`/book/${sid}`} replace />;
  }
  return <Navigate to={id ? `/events/${id}` : "/events"} replace />;
}

function EventsScrollTopButton() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 280);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname !== "/events" || !visible) return null;

  return (
    <FloatButton
      icon={<UpOutlined />}
      aria-label="Наверх"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    />
  );
}

function RouteFallback() {
  return (
    <div className="route-fallback" aria-busy="true" aria-label="Загрузка страницы">
      <Spin size="large" />
    </div>
  );
}

function AppRoutes() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header />
        <main className="app-main">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route
                path="/events/:id/booking"
                element={<LegacyEventBookingRedirect />}
              />
              <Route path="/book/:scheduleId" element={<BookingPage />} />
              <Route path="/payment/success" element={<PaymentReturnPage />} />
              <Route path="/payment/return" element={<PaymentReturnPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/vk/callback" element={<VkAuthCallbackPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/offer" element={<OfferPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route
                path="/admin/*"
                element={
                  <PrivateRoute>
                    <AdminRoute>
                      <AdminPages />
                    </AdminRoute>
                  </PrivateRoute>
                }
              />
            </Routes>
          </Suspense>
        </main>
        <EventsScrollTopButton />
        <Footer />
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ConfigProvider locale={ruRU} theme={appTheme}>
      <AppRoutes />
    </ConfigProvider>
  );
}

export default App;
