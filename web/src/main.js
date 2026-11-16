import "./styles/tailwind.css";
import "./styles/style.css";
import "./styles/tugun.css";
import "virtual:tugun-app";

import React from "react";
import ReactDOM from "react-dom/client";
import DemoOne from "@/components/ui/demo";

// Handle #login route for React Login Form
let authRoot = null;
function checkAuthRoute() {
  const isLogin = window.location.hash === "#login";
  let container = document.getElementById("auth-root");
  
  if (isLogin) {
    if (!container) {
      container = document.createElement("div");
      container.id = "auth-root";
      container.style.position = "fixed";
      container.style.inset = "0";
      container.style.zIndex = "99999";
      document.body.appendChild(container);
    }
    container.style.display = "block";
    if (!authRoot) {
      authRoot = ReactDOM.createRoot(container);
    }
    authRoot.render(React.createElement(DemoOne));
  } else if (container) {
    container.style.display = "none";
  }
}

window.addEventListener("hashchange", checkAuthRoute);
window.addEventListener("DOMContentLoaded", checkAuthRoute);
checkAuthRoute();

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); });
}
