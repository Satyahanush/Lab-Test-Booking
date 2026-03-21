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

  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  // ✅ FETCH
  const fetchBookings = async () => {
    const snapshot = await getDocs(collection(db, "bookings"));
    setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchTests = async () => {
    const snapshot = await getDocs(collection(db, "tests"));
    setTests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  // ✅ HOOK ALWAYS FIRST
  useEffect(() => {
    fetchBookings();
    fetchTests();
  }, []);

  // ================= LOGIN SCREEN =================
  if (!isLoggedIn) {
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>
        <h2>Admin Login</h2>

        <input
          type="password"
          placeholder="Enter Password"
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

  // ================= MAIN DASHBOARD =================

  const addTest = async () => {
    if (!testName || !price) return alert("Enter test & price");

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

  const updateTestInline = async (id, val) => {
    await updateDoc(doc(db, "tests", id), {
      price: Number(val)
    });
    fetchTests();
  };

  const markAsDone = async (id) => {
    await updateDoc(doc(db, "bookings", id), { status: "done" });
    fetchBookings();
  };

  const today = new Date().toISOString().split("T")[0];

  const filtered = bookings.filter(b =>
    (!selectedDate || b.date === selectedDate) &&
    (b.name?.toLowerCase().includes(search.toLowerCase()) || b.phone?.includes(search))
  );

  const todayBookings = filtered.filter(b => b.date === today && b.status !== "done");
  const records = filtered.filter(b => b.status === "done");

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "auto" }}>

      <h2 style={{ textAlign: "center" }}>Admin Dashboard</h2>

      <button onClick={() => setIsLoggedIn(false)}>Logout</button>

      <div>
        <button onClick={() => setActiveTab("bookings")}>Bookings</button>
        <button onClick={() => setActiveTab("tests")}>Tests</button>
        <button onClick={() => setActiveTab("records")}>Records</button>
      </div>

      <br />

      <input placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} />
      <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />

      <hr />

      {activeTab === "bookings" && todayBookings.map(b => (
        <div key={b.id}>
          <b>{b.name}</b> ({b.phone})
          <p>{b.tests?.map(t => `${t.name} ₹${t.price}`).join(", ")}</p>
          <p>Total: ₹{b.total}</p>
          <button onClick={() => markAsDone(b.id)}>Done</button>
        </div>
      ))}

      {activeTab === "tests" && (
        <div>
          <input placeholder="Test" value={testName} onChange={e => setTestName(e.target.value)} />
          <input placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} />
          <button onClick={addTest}>Add</button>

          {tests.map(t => (
            <div key={t.id}>
              {t.name}
              <input
                defaultValue={t.price}
                onBlur={e => updateTestInline(t.id, e.target.value)}
              />
              <button onClick={() => deleteTest(t.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {activeTab === "records" && records.map(b => (
        <div key={b.id}>
          <b>{b.name}</b> ({b.phone})
          <p>{b.tests?.map(t => `${t.name} ₹${t.price}`).join(", ")}</p>
          <p>Total: ₹{b.total}</p>
        </div>
      ))}

    </div>
  );
}

export default Admin;