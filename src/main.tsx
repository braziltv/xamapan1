import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Unregister any existing service workers (PWA removed)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('Service worker unregistered:', registration.scope);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
