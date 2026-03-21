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

  // 🔍 FILTER STATES
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const fetchBookings = async () => {
    const snap = await getDocs(collection(db, "bookings"));
    setBookings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchTests = async () => {
    const snap = await getDocs(collection(db, "tests"));
    setTests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => {
    fetchBookings();
    fetchTests();
  }, []);

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

  // 🔍 FILTER LOGIC
  const filteredBookings = bookings.filter((b) => {
    const matchSearch =
      b.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.phone?.includes(search);

    const matchDate =
      !selectedDate || b.date === selectedDate;

    return matchSearch && matchDate;
  });

  return (
    <>
      {!isLoggedIn ? (
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
      ) : (
        <div style={{ padding: "20px", maxWidth: "700px", margin: "auto" }}>

          <h2 style={{ textAlign: "center" }}>Admin Dashboard</h2>
          <button onClick={() => setIsLoggedIn(false)}>Logout</button>

          <div style={{ marginTop: "10px" }}>
            <button onClick={() => setActiveTab("bookings")}>Bookings</button>
            <button onClick={() => setActiveTab("tests")}>Tests</button>
          </div>

          <hr />

          {/* 🔍 FILTER UI */}
          {activeTab === "bookings" && (
            <div style={{ marginBottom: "15px" }}>
              <input
                placeholder="Search by name or phone"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ marginRight: "10px" }}
              />

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          )}

          {/* BOOKINGS */}
          {activeTab === "bookings" && filteredBookings.map(b => (
            <div key={b.id} style={{
              border: "1px solid #ccc",
              margin: "10px 0",
              padding: "10px",
              borderRadius: "6px"
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
                onChange={e => setTestName(e.target.value)}
              />

              <input
                placeholder="Price"
                value={price}
                onChange={e => setPrice(e.target.value)}
              />

              <button onClick={addTest}>Add</button>

              <hr />

              {tests.map(t => (
                <div key={t.id}>
                  {t.name} - ₹{t.price}
                  <button onClick={() => deleteTest(t.id)}>Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default Admin;