import { ConfigProvider, theme } from "antd";
import type { ThemeConfig } from "antd";
import ruRU from "antd/locale/ru_RU";
import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./App.css";
import { useAuthStore } from "./store/authStore";
import Footer from "./components/Footer";
import Header from "./components/Header/Header";
import AdminPages from "./pages/AdminPages";
import BookingPage from "./pages/BookingPage";
import EventDetailPage from "./pages/EventDetailPage";
import EventsPage from "./pages/EventsPage";
import Excursions from "./pages/Excursions/Excursions";
import FAQ from "./pages/FAQ/FAQ";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import Workshops from "./pages/Workshops/Workshops";

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
            <Route path="/events/:id/booking" element={<BookingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPages />} />
            <Route path="/excursions" element={<Excursions />} />
            <Route path="/workshops" element={<Workshops />} />
            <Route path="/faq" element={<FAQ />} />
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
