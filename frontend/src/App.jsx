import React from "react";
import { Outlet } from "react-router";
import { Toaster } from "react-hot-toast";
import Navigation from "./components/Navigation";

function App() {
  return (
    <div className={`font-sans mx-auto h-full`}>
      <Toaster position="top-center z-[9999999] " />
      <main className="z-0">
          <Navigation children={<Outlet />} />
      </main>
    </div>
  );
}

export default App;
