import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc
} from "firebase/firestore";

function Admin() {

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");

  const [activeTab, setActiveTab] = useState("bookings");

  const [bookings, setBookings] = useState([]);
  const [tests, setTests] = useState([]);

  const [testName, setTestName] = useState("");
  const [price, setPrice] = useState("");

  // ✅ FETCH
  useEffect(() => {
    fetchBookings();
    fetchTests();
  }, []);

  const fetchBookings = async () => {
    const snap = await getDocs(collection(db, "bookings"));
    setBookings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchTests = async () => {
    const snap = await getDocs(collection(db, "tests"));
    setTests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  // 🔐 LOGIN
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
          if (password === "Prasad@123") setIsLoggedIn(true);
          else alert("Wrong password");
        }}>
          Login
        </button>
      </div>
    );
  }

  // ✅ FUNCTIONS
  const addTest = async () => {
    if (!testName || !price) return;

    await addDoc(collection(db, "tests"), {
      name: testName,
      price: Number(price)
    });

    setTestName("");
    setPrice("");
    fetchTests();
  };

  const deleteTest = async (id) => {
    await deleteDoc(doc(db, "tests", id));
    fetchTests();
  };

  const markDone = async (id) => {
    await updateDoc(doc(db, "bookings", id), { status: "done" });
    fetchBookings();
  };

  // ================= UI =================

  return (
    <div style={{ padding: "20px" }}>

      <h2>Admin Dashboard</h2>

      <button onClick={() => setIsLoggedIn(false)}>Logout</button>

      <div>
        <button onClick={() => setActiveTab("bookings")}>Bookings</button>
        <button onClick={() => setActiveTab("tests")}>Tests</button>
      </div>

      <hr />

      {/* BOOKINGS */}
      {activeTab === "bookings" && bookings.map(b => (
        <div key={b.id} style={{ border: "1px solid #ccc", margin: "10px", padding: "10px" }}>
          <b>{b.name}</b> ({b.phone})
          <p>Total: ₹{b.total}</p>
          <button onClick={() => markDone(b.id)}>Mark Done</button>
        </div>
      ))}

      {/* TESTS */}
      {activeTab === "tests" && (
        <div>
          <input placeholder="Test Name" value={testName} onChange={e => setTestName(e.target.value)} />
          <input placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} />
          <button onClick={addTest}>Add</button>

          {tests.map(t => (
            <div key={t.id}>
              {t.name} - ₹{t.price}
              <button onClick={() => deleteTest(t.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export default Admin;