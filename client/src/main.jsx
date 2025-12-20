import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./lib/i18n.js"; // Initialize i18n
import { PreferencesProvider } from "./lib/currency.jsx";

createRoot(document.getElementById("root")).render(
  <PreferencesProvider>
    <App />
  </PreferencesProvider>
);
