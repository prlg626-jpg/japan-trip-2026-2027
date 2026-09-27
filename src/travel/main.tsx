import React from "react";
import ReactDOM from "react-dom/client";
import TravelApp from "./TravelApp";

ReactDOM.createRoot(document.getElementById("travel-root") as HTMLElement).render(
  <React.StrictMode>
    <TravelApp />
  </React.StrictMode>,
);
