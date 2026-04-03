import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Ant Design: стили через CSS-in-JS у ConfigProvider
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
