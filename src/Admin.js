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

  const [activeTab, setActiveTab] = useState("bookings");

  const [bookings, setBookings] = useState([]);
  const [tests, setTests] = useState([]);

  const [testName, setTestName] = useState("");
  const [price, setPrice] = useState("");

  // 🔍 NEW STATES
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

  useEffect(() => {
    fetchBookings();
    fetchTests();
  }, []);

  // ================= TEST MANAGEMENT =================

  const addTest = async () => {
    if (!testName || !price) {
      alert("Enter test name and price");
      return;
    }

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

  // ================= BOOKING STATUS =================

  const markAsDone = async (id) => {
    await updateDoc(doc(db, "bookings", id), {
      status: "done"
    });

    fetchBookings();
  };

  // ================= FILTER LOGIC =================

  const today = new Date().toISOString().split("T")[0];

  const filterData = (data) => {
    return data.filter((b) => {

      const matchesSearch =
        b.name?.toLowerCase().includes(search.toLowerCase()) ||
        b.phone?.includes(search);

      const matchesDate =
        selectedDate === "" || b.date === selectedDate;

      return matchesSearch && matchesDate;
    });
  };

  const todayBookings = filterData(
    bookings.filter((b) => b.date === today && b.status !== "done")
  );

  const records = filterData(
    bookings.filter((b) => b.status === "done")
  );

  // ================= UI =================

  const buttonStyle = {
    padding: "10px",
    marginRight: "10px",
    cursor: "pointer"
  };

  const inputStyle = {
    padding: "10px",
    marginRight: "10px",
    marginBottom: "10px"
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "auto" }}>

      <h2 style={{ textAlign: "center" }}>Admin Dashboard</h2>

      {/* MENU */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <button style={buttonStyle} onClick={() => setActiveTab("bookings")}>
          📋 Bookings
        </button>

        <button style={buttonStyle} onClick={() => setActiveTab("tests")}>
          🧪 Tests
        </button>

        <button style={buttonStyle} onClick={() => setActiveTab("records")}>
          📊 Records
        </button>
      </div>

      {/* 🔍 SEARCH + DATE FILTER */}
      {(activeTab === "bookings" || activeTab === "records") && (
        <div style={{ marginBottom: "15px" }}>
          <input
            placeholder="Search by name or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={inputStyle}
          />

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={inputStyle}
          />
        </div>
      )}

      {/* ================= BOOKINGS ================= */}
      {activeTab === "bookings" && (
        <div>
          <h3>Today's Bookings</h3>

          {todayBookings.length === 0 && <p>No bookings found</p>}

          {todayBookings.map((b) => (
            <div key={b.id} style={{
              padding: "10px",
              marginBottom: "10px",
              border: "1px solid #ccc",
              borderRadius: "8px"
            }}>
              <p><b>{b.name}</b></p>
              <p>{b.phone}</p>
              <p>{b.test}</p>
              <p>{b.date} | {b.slot}</p>

              <button
                style={{ ...buttonStyle, background: "green", color: "#fff" }}
                onClick={() => markAsDone(b.id)}
              >
                Mark as Done
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ================= TESTS ================= */}
      {activeTab === "tests" && (
        <div>
          <h3>Manage Tests</h3>

          <input
            placeholder="Test Name"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            style={{ padding: "10px", width: "45%", marginRight: "5%" }}
          />

          <input
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            style={{ padding: "10px", width: "45%" }}
          />

          <br /><br />

          <button
            style={{ ...buttonStyle, background: "#007bff", color: "#fff" }}
            onClick={addTest}
          >
            Add Test
          </button>

          <div style={{ marginTop: "20px" }}>
            {tests.map((t) => (
              <div key={t.id} style={{
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                marginBottom: "10px"
              }}>
                <b>{t.name}</b>

                <input
                  type="number"
                  defaultValue={t.price}
                  onBlur={(e) => updateTestInline(t.id, e.target.value)}
                  style={{ marginLeft: "10px", width: "80px" }}
                />

                <button
                  style={{ ...buttonStyle, background: "red", color: "#fff" }}
                  onClick={() => deleteTest(t.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= RECORDS ================= */}
      {activeTab === "records" && (
        <div>
          <h3>Completed Records</h3>

          {records.length === 0 && <p>No records found</p>}

          {records.map((b) => (
            <div key={b.id} style={{
              padding: "10px",
              marginBottom: "10px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              background: "#f0f0f0"
            }}>
              <p><b>{b.name}</b></p>
              <p>{b.phone}</p>
              <p>{b.test}</p>
              <p>{b.date} | {b.slot}</p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export default Admin;