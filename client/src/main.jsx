import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./lib/i18n.js"; // Initialize i18n
import { PreferencesProvider } from "./lib/currency.jsx";

import { ThemeProvider } from "@/components/theme-provider";

createRoot(document.getElementById("root")).render(
  <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
    <PreferencesProvider>
      <App />
    </PreferencesProvider>
  </ThemeProvider>
);
