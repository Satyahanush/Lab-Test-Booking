import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Booking from "./Booking";
import Admin from "./Admin";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Booking />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
}

export default App;