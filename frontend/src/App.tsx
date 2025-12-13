import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import Footer from "./components/Footer";
import Header from "./components/Header/Header";
import Events from "./pages/Events/Events";
import Excursions from "./pages/Excursions/Excursions";
import FAQ from "./pages/FAQ/FAQ";
import Main from "./pages/Main/Main";
import Workshops from "./pages/Workshops/Workshops";

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="*" element={<Main />} />
        <Route path="events" element={<Events />} />
        <Route path="excursions" element={<Excursions />} />
        <Route path="workshops" element={<Workshops />} />
        <Route path="faq" element={<FAQ />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
