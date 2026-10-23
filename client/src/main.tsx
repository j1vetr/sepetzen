import { createRoot } from "react-dom/client";
import App from "./App";
import { loadAdminPath } from "./lib/adminPath";
import "./index.css";

// Ödeme penceresi (iframe) işlem bitince sitemize döner. Siteyi iç içe göstermemek için üst sayfaya geç.
if (window.self !== window.top && window.location.pathname.startsWith("/hesabim")) {
  try {
    window.top!.location.replace(window.location.href);
  } catch {
    /* farklı kaynak ise yoksay */
  }
}

loadAdminPath().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
