import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./app/theme";
import { AuthProvider } from "./app/auth";
import { SettingsProvider } from "./app/settings";
import { DataProvider } from "./app/data";
import "./styles/global.css";

// Router choice: default BrowserRouter (clean paths on Netlify / GitHub Pages).
// A single-file, server-less build (e.g. a shareable demo bundle) sets
// VITE_ROUTER=hash so routing works with no server rewrites.
const useHash = import.meta.env.VITE_ROUTER === "hash";
const Router = useHash ? HashRouter : BrowserRouter;
const routerProps = useHash ? {} : { basename: import.meta.env.BASE_URL };

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <DataProvider>
            <Router {...routerProps}>
              <App />
            </Router>
          </DataProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
