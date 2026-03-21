import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

function Booking() {

  const inputStyle = {
    width: "100%",
    padding: "10px",
    marginBottom: "12px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "14px"
  };

  const buttonStyle = {
    width: "100%",
    padding: "12px",
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    cursor: "pointer"
  };

  const [form, setForm] = useState({
    name: "",
    phone: "",
    date: "",
    slot: ""
  });

  const [tests, setTests] = useState([]);
  const [selectedTests, setSelectedTests] = useState([]);

  // ✅ Fetch tests
  useEffect(() => {
    const fetchTests = async () => {
      const snapshot = await getDocs(collection(db, "tests"));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTests(data);
    };

    fetchTests();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  // ✅ Add test to list
  const addTest = (e) => {
    const testId = e.target.value;
    const selected = tests.find(t => t.id === testId);

    if (!selected) return;

    // avoid duplicates
    if (selectedTests.find(t => t.id === testId)) return;

    setSelectedTests([...selectedTests, selected]);
  };

  // ✅ Remove test
  const removeTest = (id) => {
    setSelectedTests(selectedTests.filter(t => t.id !== id));
  };

  // ✅ Total calculation
  const totalAmount = selectedTests.reduce((sum, t) => sum + t.price, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedTests.length === 0) {
      alert("Please select at least one test");
      return;
    }

    try {
      await addDoc(collection(db, "bookings"), {
        ...form,
        tests: selectedTests,
        total: totalAmount,
        createdAt: new Date()
      });

      alert("Booking Successful!");

      setForm({
        name: "",
        phone: "",
        date: "",
        slot: ""
      });

      setSelectedTests([]);

    } catch (err) {
      console.error(err);
      alert("Error saving booking");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      background: "#f4f6f8"
    }}>
      <div style={{
        background: "#fff",
        padding: "30px",
        borderRadius: "12px",
        width: "350px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
      }}>

         <h2 style={{
           textAlign: "center",
           marginBottom: "5px",
           color: "#007bff",
           fontWeight: "bold"
           }}>
              Sri Balaji Diagnostics
         </h2>
         <p style={{ textAlign: "center", marginBottom: "20px", color: "#555" }}>
         Lab Test Booking
         </p>

        <form onSubmit={handleSubmit}>

          <input name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required style={inputStyle} />

          <input name="phone" placeholder="Phone Number" value={form.phone} onChange={handleChange} required style={inputStyle} />

          {/* ✅ ADD TEST DROPDOWN */}
          <select onChange={addTest} style={inputStyle}>
            <option value="">Add Test</option>
            {tests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} - ₹{t.price}
              </option>
            ))}
          </select>

          {/* ✅ SELECTED TESTS LIST */}
          {selectedTests.map((t) => (
            <div key={t.id} style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px"
            }}>
              <span>{t.name} - ₹{t.price}</span>

              <button
                type="button"
                onClick={() => removeTest(t.id)}
                style={{ color: "red", border: "none", background: "none" }}
              >
                ❌
              </button>
            </div>
          ))}

          {/* ✅ TOTAL */}
          <h3>Total: ₹{totalAmount}</h3>

          <input type="date" name="date" value={form.date} onChange={handleChange} required style={inputStyle} />

          <select name="slot" value={form.slot} onChange={handleChange} required style={inputStyle}>
            <option value="">Select Time Slot</option>
            <option value="7-9 AM">7-9 AM</option>
            <option value="9-11 AM">9-11 AM</option>
          </select>

          <button type="submit" style={buttonStyle}>
            Book Appointment
          </button>

        </form>
      </div>
    </div>
  );
}

export default Booking;