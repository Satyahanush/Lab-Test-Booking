import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

function Booking() {
  const [availableTests, setAvailableTests] = useState([]);
  const [testSearch, setTestSearch] = useState("");
  const [selectedTests, setSelectedTests] = useState([]);
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  
  const [status, setStatus] = useState("idle"); // idle, loading, success
  const [bookingId, setBookingId] = useState("");

  useEffect(() => {
    const fetchTests = async () => {
      const snap = await getDocs(collection(db, "tests"));
      setAvailableTests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchTests();
  }, []);

  const toggleTest = (test) => {
    if (selectedTests.find(t => t.id === test.id)) {
      setSelectedTests(selectedTests.filter(t => t.id !== test.id));
    } else {
      setSelectedTests([...selectedTests, test]);
    }
  };

  const totalAmount = selectedTests.reduce((sum, test) => sum + test.price, 0);

  const filteredTests = availableTests.filter(t => 
    t.name.toLowerCase().includes(testSearch.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedTests.length === 0) return alert("Please select at least one test.");
    
    setStatus("loading");
    try {
      const docRef = await addDoc(collection(db, "bookings"), {
        name,
        phone,
        date,
        tests: selectedTests,
        total: totalAmount,
        status: "pending",
        createdAt: serverTimestamp()
      });
      setBookingId(docRef.id.slice(0, 6).toUpperCase()); // Generate a short Booking ID
      setStatus("success");
    } catch (error) {
      alert("Error booking test. Please try again.");
      setStatus("idle");
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border-t-4 border-green-500">
          <div className="text-green-500 text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-600 mb-6">Thank you, {name}. Your test is scheduled for {date}.</p>
          <div className="bg-gray-100 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Your Booking ID</p>
            <p className="text-3xl font-mono font-bold text-blue-700">{bookingId}</p>
          </div>
          <button onClick={() => window.location.reload()} className="text-blue-600 font-semibold hover:underline">Book Another Test</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 font-sans">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6">
        
        {/* LEFT COLUMN: Test Selection */}
        <div className="flex-1 bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <h2 className="text-2xl font-bold text-blue-800 mb-6">1. Select Lab Tests</h2>
          
          <input 
            type="text" 
            placeholder="🔍 Search for a test (e.g., Blood Sugar)..." 
            value={testSearch}
            onChange={(e) => setTestSearch(e.target.value)}
            className="w-full p-3 mb-4 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition"
          />

          <div className="max-h-96 overflow-y-auto pr-2 space-y-2">
            {filteredTests.map(test => {
              const isSelected = selectedTests.find(t => t.id === test.id);
              return (
                <div 
                  key={test.id} 
                  onClick={() => toggleTest(test)}
                  className={`p-4 rounded-lg border cursor-pointer transition flex justify-between items-center ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                >
                  <div>
                    <h3 className={`font-bold ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>{test.name}</h3>
                    <p className="text-sm text-gray-500">Results typically in 24 hrs</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-800">₹{test.price}</span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {isSelected && <span className="text-white text-xs">✓</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Patient Details & Summary */}
        <div className="w-full md:w-96 bg-white p-6 rounded-xl shadow-md border border-gray-100 h-fit">
          <h2 className="text-2xl font-bold text-blue-800 mb-6">2. Patient Details</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter patient name" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (WhatsApp)</label>
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="10-digit mobile number" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div className="mt-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-bold text-gray-700 mb-2">Booking Summary</h3>
              <div className="text-sm text-gray-600 mb-3 space-y-1">
                {selectedTests.length === 0 ? <p className="italic">No tests selected yet.</p> : selectedTests.map(t => (
                  <div key={t.id} className="flex justify-between">
                    <span>{t.name}</span>
                    <span>₹{t.price}</span>
                  </div>
                ))}
              </div>
              <hr className="border-gray-300 my-2" />
              <div className="flex justify-between items-center text-lg font-bold text-blue-800">
                <span>Total Amount</span>
                <span>₹{totalAmount}</span>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={status === "loading"}
              className={`w-full py-4 rounded-lg font-bold text-white text-lg transition ${status === "loading" ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'}`}
            >
              {status === "loading" ? "Processing..." : "Confirm Booking"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

export default Booking;