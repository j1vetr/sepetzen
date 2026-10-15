import { createRoot } from "react-dom/client";
import App from "./App";
import { loadAdminPath } from "./lib/adminPath";
import "./index.css";

loadAdminPath().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
