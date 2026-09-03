import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import { api } from "./api";
import { setDecimalPlaces } from "./format";
import { Layout } from "./Layout";
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
  try {
    const settings = await api.settings.get();
    setDecimalPlaces(settings.decimalPlaces);
  } catch {
    // fall back to the default (0) if settings can't be reached
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
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
