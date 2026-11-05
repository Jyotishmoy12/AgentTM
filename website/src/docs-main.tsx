import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DocsPage } from "./DocsPage";
import "./styles.css";
import "./premium.css";
import "./sections.css";
import "./comparison.css";
import "./theme.css";
import "./docs.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DocsPage />
  </StrictMode>,
);
