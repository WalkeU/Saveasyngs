import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import { Layout } from "./Layout";
import { Dashboard } from "./pages/Dashboard";
import { Transactions } from "./pages/Transactions";
import { Import } from "./pages/Import";
import { Categories } from "./pages/Categories";
import { Rules } from "./pages/Rules";
import { Savings } from "./pages/Savings";
import { Recurring } from "./pages/Recurring";

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
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
