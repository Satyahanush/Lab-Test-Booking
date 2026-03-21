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

  // 🔐 LOGIN STATE
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");

  // NAVIGATION
  const [activeTab, setActiveTab] = useState("bookings");

  // DATA
  const [bookings, setBookings] = useState([]);
  const [tests, setTests] = useState([]);

  const [testName, setTestName] = useState("");
  const [price, setPrice] = useState("");

  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  // ================= FETCH =================

  const fetchBookings = async () => {
    const snapshot = await getDocs(collection(db, "bookings"));
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setBookings(data);
  };

  const fetchTests = async () => {
    const snapshot = await getDocs(collection(db, "tests"));
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setTests(data);
  };

  // ✅ ALWAYS FIRST (no condition)
  useEffect(() => {
    fetchBookings();
    fetchTests();
  }, []);

  // ================= TEST MANAGEMENT =================

  const addTest = async () => {
    if (!testName || !price) return alert("Enter test name & price");

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

  const updateTestInline = async (id, newPrice) => {
    if (!newPrice) return;

    await updateDoc(doc(db, "tests", id), {
      price: Number(newPrice)
    });

    fetchTests();
  };

  // ================= BOOKINGS =================

  const markAsDone = async (id) => {
    await updateDoc(doc(db, "bookings", id), {
      status: "done"
    });
    fetchBookings();
  };

  // ================= FILTER =================

  const filterData = (data) => {
    return data.filter((b) => {
      const matchesSearch =
        b.name?.toLowerCase().includes(search.toLowerCase()) ||
        b.phone?.includes(search);

      const matchesDate =
        !selectedDate || b.date === selectedDate;

      return matchesSearch && matchesDate;
    });
  };

  const today = new Date().toISOString().split("T")[0];

  const todayBookings = filterData(
    bookings.filter((b) => b.date === today && b.status !== "done")
  );

  const records = filterData(
    bookings.filter((b) => b.status === "done")
  );

  // ================= UI =================

  // 🔥 IMPORTANT: NO RETURN BEFORE THIS
  return !isLoggedIn ? (

    // LOGIN SCREEN
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

  ) : (

    // MAIN DASHBOARD
    <div style={{ padding: "20px", maxWidth: "600px", margin: "auto" }}>

      <h2 style={{ textAlign: "center" }}>Admin Dashboard</h2>

      <button onClick={() => setIsLoggedIn(false)} style={{ float: "right" }}>
        Logout
      </button>

      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <button onClick={() => setActiveTab("bookings")}>📋 Bookings</button>
        <button onClick={() => setActiveTab("tests")}>🧪 Tests</button>
        <button onClick={() => setActiveTab("records")}>📊 Records</button>
      </div>

      {(activeTab === "bookings" || activeTab === "records") && (
        <div>
          <input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      )}

      {/* BOOKINGS */}
      {activeTab === "bookings" && todayBookings.map((b) => (
        <div key={b.id}>
          <b>{b.name}</b> ({b.phone})
          <p>{b.tests?.map(t => `${t.name} ₹${t.price}`).join(", ")}</p>
          <p>Total: ₹{b.total}</p>
          <button onClick={() => markAsDone(b.id)}>Done</button>
        </div>
      ))}

      {/* TESTS */}
      {activeTab === "tests" && (
        <div>
          <input placeholder="Test" value={testName} onChange={(e) => setTestName(e.target.value)} />
          <input placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
          <button onClick={addTest}>Add</button>

          {tests.map(t => (
            <div key={t.id}>
              {t.name}
              <input
                type="number"
                defaultValue={t.price}
                onBlur={(e) => updateTestInline(t.id, e.target.value)}
              />
              <button onClick={() => deleteTest(t.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {/* RECORDS */}
      {activeTab === "records" && records.map((b) => (
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