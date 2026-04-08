import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import dayjs from "dayjs";
import "dayjs/locale/ru";

// Календари Ant Design (RangePicker и т.д.)
dayjs.locale("ru");

// Ant Design: стили через CSS-in-JS у ConfigProvider
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
