import { ConfigProvider, theme } from "antd";
import type { ThemeConfig } from "antd";
import ruRU from "antd/locale/ru_RU";
import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useParams,
  useSearchParams,
} from "react-router-dom";

import "./App.css";
import { useAuthStore } from "./store/authStore";
import Footer from "./components/Footer";
import Header from "./components/Header/Header";
import AdminPages from "./pages/AdminPages";
import BookingPage from "./pages/BookingPage";
import EventDetailPage from "./pages/EventDetailPage";
import EventsPage from "./pages/EventsPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import PaymentReturnPage from "./pages/PaymentReturnPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";

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

function AppRoutes() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route
            path="/events/:id/booking"
            element={<LegacyEventBookingRedirect />}
          />
          <Route path="/book/:scheduleId" element={<BookingPage />} />
          <Route path="/payment/return" element={<PaymentReturnPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPages />} />
        </Routes>
      </main>
      <Footer />
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
