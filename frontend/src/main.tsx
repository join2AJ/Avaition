import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./app/theme";
import { AuthProvider } from "./app/auth";
import { SettingsProvider } from "./app/settings";
import { DataProvider } from "./app/data";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <DataProvider>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <App />
            </BrowserRouter>
          </DataProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
