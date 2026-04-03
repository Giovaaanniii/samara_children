import { ConfigProvider } from "antd";
import ruRU from "antd/locale/ru_RU";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./App.css";
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

function App() {
  return (
    <ConfigProvider locale={ruRU}>
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
    </ConfigProvider>
  );
}

export default App;
