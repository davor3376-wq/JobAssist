import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { I18nProvider } from "./context/I18nContext";
import queryClient from "./queryClient";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <I18nProvider>
          <App />
          <Toaster position="top-right" />
        </I18nProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
