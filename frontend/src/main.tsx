import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import { api } from "./api";
import { setDecimalPlaces } from "./format";
import { Layout } from "./Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Transactions } from "./pages/Transactions";
import { Import } from "./pages/Import";
import { Categories } from "./pages/Categories";
import { Rules } from "./pages/Rules";
import { Savings } from "./pages/Savings";
import { Recurring } from "./pages/Recurring";
import { Settings } from "./pages/Settings";
import { History } from "./pages/History";

async function bootstrap() {
  const root = createRoot(document.getElementById("root")!);

  let authRequired = false;
  let authenticated = true;
  let needsSetup = false;
  try {
    const status = await api.auth.status();
    authRequired = status.authRequired;
    authenticated = status.authenticated;
    needsSetup = status.needsSetup;
  } catch {
    // can't reach the backend at all — let it through; every subsequent
    // API call will fail the same way, so this isn't an auth bypass
  }

  if (authRequired && needsSetup) {
    root.render(
      <StrictMode>
        <Login mode="setup" onSuccess={() => window.location.reload()} />
      </StrictMode>,
    );
    return;
  }

  if (authRequired && !authenticated) {
    root.render(
      <StrictMode>
        <Login mode="login" onSuccess={() => window.location.reload()} />
      </StrictMode>,
    );
    return;
  }

  try {
    const settings = await api.settings.get();
    setDecimalPlaces(settings.decimalPlaces);
  } catch {
    // fall back to the default (0) if settings can't be reached
  }

  root.render(
    <StrictMode>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout authEnabled={authRequired} />}>
            <Route index element={<Dashboard />} />
            <Route path="tranzakciok" element={<Transactions />} />
            <Route path="megtakaritas" element={<Savings />} />
            <Route path="ismetlodok" element={<Recurring />} />
            <Route path="import" element={<Import />} />
            <Route path="kategoriak" element={<Categories />} />
            <Route path="szabalyok" element={<Rules />} />
            <Route path="beallitasok" element={<Settings />} />
            <Route path="elozmenyek" element={<History />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StrictMode>,
  );
}

bootstrap();
