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

  // ================= FETCH =================
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

  // ================= FUNCTIONS =================

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

  const updatePrice = async (id, newPrice) => {
    if (!newPrice) return;
    await updateDoc(doc(db, "tests", id), {
      price: Number(newPrice)
    });
    fetchTests();
  };

  const markDone = async (id) => {
    await updateDoc(doc(db, "bookings", id), { status: "done" });
    fetchBookings();
  };

  // ================= FILTER =================

  const filterData = (data) => {
    return data.filter((b) => {
      const matchSearch =
        b.name?.toLowerCase().includes(search.toLowerCase()) ||
        b.phone?.includes(search);

      const matchDate =
        !selectedDate || b.date === selectedDate;

      return matchSearch && matchDate;
    });
  };

  const today = new Date().toISOString().split("T")[0];

  const todayBookings = filterData(
    bookings.filter(b => b.status !== "done")
  );

  const records = filterData(
    bookings.filter(b => b.status === "done")
  );

  // ================= UI =================

  return (
    <div style={{ padding: "20px", maxWidth: "750px", margin: "auto" }}>

      <h2 style={{ textAlign: "center" }}>Admin Dashboard</h2>

      <button onClick={() => setIsLoggedIn(false)}>Logout</button>

      {/* MENU */}
      <div style={{ marginTop: "10px" }}>
        <button onClick={() => setActiveTab("bookings")}>📋 Bookings</button>
        <button onClick={() => setActiveTab("tests")}>🧪 Tests</button>
        <button onClick={() => setActiveTab("records")}>📊 Records</button>
      </div>

      <hr />

      {/* FILTER */}
      {(activeTab === "bookings" || activeTab === "records") && (
        <div style={{ marginBottom: "15px" }}>
          <input
            placeholder="Search name / phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginRight: "10px", padding: "6px" }}
          />

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ padding: "6px" }}
          />
        </div>
      )}

      {/* BOOKINGS */}
      {activeTab === "bookings" && todayBookings.map(b => (
        <div key={b.id} style={{
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "10px",
          borderRadius: "6px",
          background: "#f9f9f9"
        }}>
          <b>{b.name}</b> ({b.phone})

          <p>
            {b.tests?.map(t => `${t.name} ₹${t.price}`).join(", ")}
          </p>

          <p><b>Total:</b> ₹{b.total}</p>
          <p><b>Date:</b> {b.date}</p>

          <button onClick={() => markDone(b.id)}>
            Mark Done
          </button>
        </div>
      ))}

      {/* TESTS */}
      {activeTab === "tests" && (
        <div>
          <input
            placeholder="Test Name"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
          />

          <input
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />

          <button onClick={addTest}>Add</button>

          <hr />

          {tests.map(t => (
            <div key={t.id} style={{ marginBottom: "10px" }}>
              {t.name}

              <input
                type="number"
                defaultValue={t.price}
                onBlur={(e) => updatePrice(t.id, e.target.value)}
                style={{ marginLeft: "10px" }}
              />

              <button onClick={() => deleteTest(t.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* RECORDS */}
      {activeTab === "records" && records.map(b => (
        <div key={b.id} style={{
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "10px",
          borderRadius: "6px",
          background: "#eef7ff"
        }}>
          <b>{b.name}</b> ({b.phone})

          <p>
            {b.tests?.map(t => `${t.name} ₹${t.price}`).join(", ")}
          </p>

          <p><b>Total:</b> ₹{b.total}</p>
          <p><b>Date:</b> {b.date}</p>
        </div>
      ))}

    </div>
  );
}

export default Admin;