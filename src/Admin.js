import React, { useEffect, useState } from "react";

function Admin() {

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    console.log("Admin loaded");
  }, []);

  if (!isLoggedIn) {
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>
        <h2>Admin Login</h2>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <br /><br />

        <button onClick={() => {
          if (password === "1234") setIsLoggedIn(true);
          else alert("Wrong password");
        }}>
          Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "50px" }}>
      <h2>Admin Dashboard</h2>
      <button onClick={() => setIsLoggedIn(false)}>Logout</button>
    </div>
  );
}

export default Admin;