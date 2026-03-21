import React, { useEffect, useState } from "react";
import { db, auth } from "./firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";

function Admin() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [activeTab, setActiveTab] = useState("bookings");
  const [bookings, setBookings] = useState([]);
  const [tests, setTests] = useState([]);
  
  const [testName, setTestName] = useState("");
  const [price, setPrice] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  // Check if admin is logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchBookings();
        fetchTests();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert("Login Failed. Please check your email and password.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const fetchBookings = async () => {
    const snap = await getDocs(collection(db, "bookings"));
    setBookings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchTests = async () => {
    const snap = await getDocs(collection(db, "tests"));
    setTests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  // ================= FUNCTIONS =================
  const addTest = async () => {
    if (!testName || !price) return;
    await addDoc(collection(db, "tests"), {
      name: testName,
      price: Number(price),
      createdAt: serverTimestamp() // Better data structure
    });
    setTestName("");
    setPrice("");
    fetchTests();
  };

  const deleteTest = async (id) => {
    if(window.confirm("Are you sure you want to delete this test?")) {
        await deleteDoc(doc(db, "tests", id));
        fetchTests();
    }
  };

  const markDone = async (id) => {
    await updateDoc(doc(db, "bookings", id), { status: "done" });
    fetchBookings();
  };

  // ================= FILTER =================
  const filterData = (data) => {
    return data.filter((b) => {
      const matchSearch = (b.name?.toLowerCase().includes(search.toLowerCase())) || (b.phone?.includes(search));
      const matchDate = !selectedDate || b.date === selectedDate;
      return matchSearch && matchDate;
    });
  };

  const todayBookings = filterData(bookings.filter(b => b.status !== "done"));
  const records = filterData(bookings.filter(b => b.status === "done"));

  // ================= UI: LOGIN =================
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-md w-96 border border-gray-200">
          <h2 className="text-2xl font-bold text-center text-blue-700 mb-6">Lab Admin Portal</h2>
          <input type="email" placeholder="Admin Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 mb-4 border rounded bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 mb-6 border rounded bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" required />
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 transition">Secure Login</button>
        </form>
      </div>
    );
  }

  // ================= UI: DASHBOARD =================
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        
        {/* Header */}
        <div className="bg-blue-700 p-6 flex justify-between items-center text-white">
          <h2 className="text-2xl font-bold">Sri Balaji Diagnostics - Admin</h2>
          <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-sm font-semibold transition">Logout</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          <button onClick={() => setActiveTab("bookings")} className={`flex-1 py-4 font-semibold ${activeTab === "bookings" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}>📋 Live Bookings ({todayBookings.length})</button>
          <button onClick={() => setActiveTab("tests")} className={`flex-1 py-4 font-semibold ${activeTab === "tests" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}>🧪 Manage Tests</button>
          <button onClick={() => setActiveTab("records")} className={`flex-1 py-4 font-semibold ${activeTab === "records" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}>📊 Past Records</button>
        </div>

        <div className="p-6">
          {/* Filters for Bookings & Records */}
          {(activeTab === "bookings" || activeTab === "records") && (
            <div className="flex gap-4 mb-6 bg-gray-50 p-4 rounded-lg border">
              <input type="text" placeholder="Search patient name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}

          {/* TAB: BOOKINGS */}
          {activeTab === "bookings" && (
            <div className="grid gap-4 md:grid-cols-2">
              {todayBookings.length === 0 ? <p className="text-gray-500 text-center col-span-2 py-8">No pending bookings found.</p> : todayBookings.map(b => (
                <div key={b.id} className="border border-blue-200 bg-blue-50 p-5 rounded-lg shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{b.name}</h3>
                      <p className="text-sm text-gray-600">📞 {b.phone}</p>
                    </div>
                    <span className="bg-yellow-200 text-yellow-800 text-xs font-bold px-2 py-1 rounded">Pending</span>
                  </div>
                  <hr className="my-2 border-blue-100" />
                  <p className="text-sm text-gray-700 mb-2 font-medium">Tests: {b.tests?.map(t => t.name).join(", ")}</p>
                  <p className="text-lg font-bold text-blue-700 mb-4">Total: ₹{b.total}</p>
                  
                  <div className="flex gap-2">
                    <button onClick={() => markDone(b.id)} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded font-semibold transition">✅ Mark Done</button>
                    <a href={`https://wa.me/91${b.phone}?text=Hello ${b.name}, your test booking at Sri Balaji Diagnostics is confirmed for ${b.date}. Total amount: ₹${b.total}. Please reply to this message for any queries.`} target="_blank" rel="noreferrer" className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-semibold text-center transition">💬 WhatsApp</a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB: TESTS */}
          {activeTab === "tests" && (
            <div>
              <div className="flex gap-4 mb-6 bg-gray-50 p-4 rounded-lg border items-end">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Test Name</label>
                  <input type="text" placeholder="e.g. Complete Blood Count" value={testName} onChange={(e) => setTestName(e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <div className="w-32">
                  <label className="block text-sm text-gray-600 mb-1">Price (₹)</label>
                  <input type="number" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <button onClick={addTest} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold transition h-[42px]">Add Test</button>
              </div>

              <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700">
                      <th className="p-3 border-b">Test Name</th>
                      <th className="p-3 border-b">Price (₹)</th>
                      <th className="p-3 border-b text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="p-3 border-b font-medium text-gray-800">{t.name}</td>
                        <td className="p-3 border-b text-blue-600 font-bold">₹{t.price}</td>
                        <td className="p-3 border-b text-right">
                          <button onClick={() => deleteTest(t.id)} className="text-red-500 hover:text-red-700 font-medium">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: RECORDS */}
          {activeTab === "records" && (
            <div className="grid gap-4 md:grid-cols-2">
               {records.length === 0 ? <p className="text-gray-500 text-center col-span-2 py-8">No completed records found.</p> : records.map(b => (
                <div key={b.id} className="border border-gray-200 bg-gray-50 p-5 rounded-lg shadow-sm opacity-80">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{b.name}</h3>
                      <p className="text-sm text-gray-600">Date: {b.date}</p>
                    </div>
                    <span className="bg-green-200 text-green-800 text-xs font-bold px-2 py-1 rounded">Completed</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">Tests: {b.tests?.map(t => t.name).join(", ")}</p>
                  <p className="text-md font-bold text-gray-700 mb-3">Total Paid: ₹{b.total}</p>
                  <a href={`https://wa.me/91${b.phone}?text=Hello ${b.name}, your lab test reports from Sri Balaji Diagnostics are ready. Please collect them or let us know if you need a digital copy.`} target="_blank" rel="noreferrer" className="block w-full bg-white border border-green-500 text-green-600 hover:bg-green-50 py-2 rounded font-semibold text-center transition">Send Reports via WhatsApp</a>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Admin;