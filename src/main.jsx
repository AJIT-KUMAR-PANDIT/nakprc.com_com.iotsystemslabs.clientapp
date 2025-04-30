// import { BrowserRouter } from "react-router-dom";
// import React from "react";
// import ReactDOM from "react-dom/client";
// import App from "./App";
// import "./index.css";
// import { LLMProvider } from "./services/llmService";
// import { registerServiceWorker } from "./registerServiceWorker";
// import ErrorBoundary from "./components/ErrorBoundary"; // Import the ErrorBoundary
// import { defineCustomElements } from "@ionic/pwa-elements/loader";

// // Call the element loader
// defineCustomElements(window);

// // Register service worker before rendering the app
// async function initApp() {
//   try {
//     // Try to register service worker first
//     if ("serviceWorker" in navigator) {
//       await registerServiceWorker();
//     }

//     // Then render the app
//     ReactDOM.createRoot(document.getElementById("root")).render(
//       <React.StrictMode>
//         <LLMProvider>
//           <BrowserRouter>
//             <App />
//           </BrowserRouter>
//         </LLMProvider>
//       </React.StrictMode>
//     );
//   } catch (error) {
//     console.error("Failed to initialize app:", error);

//     // Fallback to rendering without service worker
//     ReactDOM.createRoot(document.getElementById("root")).render(
//       <React.StrictMode>
//         <ErrorBoundary>
//           <LLMProvider>
//             <App />
//           </LLMProvider>
//         </ErrorBoundary>
//       </React.StrictMode>
//     );
//   }
// }

// initApp();

import React from "react";
import ReactDOM from "react-dom";
import { App } from "./App";
import "./index.css";

// For mobile support
import { defineCustomElements } from "@ionic/pwa-elements/loader";

// Call the element loader
defineCustomElements(window);

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
