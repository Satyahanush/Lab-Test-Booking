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
  
  const [status, setStatus] = useState("idle"); 
  const [bookingId, setBookingId] = useState("");

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const snap = await getDocs(collection(db, "tests"));
        setAvailableTests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Fetch error:", err);
      }
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

  const totalAmount = selectedTests.reduce((sum, test) => sum + (Number(test.price) || 0), 0);

  const filteredTests = availableTests.filter(t => 
    t.name?.toLowerCase().includes(testSearch.toLowerCase())
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
      
      const newBookingId = docRef.id.slice(0, 6).toUpperCase();
      setBookingId(newBookingId); 

      // 2. SEND TELEGRAM ALERT
      const TELEGRAM_CHAT_ID = "8703251648";
      const message = `🚨 *New Lab Booking!*\n\n*ID:* ${newBookingId}\n*Patient:* ${name}\n*Phone:* ${phone}\n*Date:* ${date}\n*Total:* ₹${totalAmount}\n*Tests:* ${selectedTests.map(t => t.name).join(", ")}`;

      await fetch(`https://api.telegram.org/bot8688192298:AAG-iiHQJLq1iulo5PdI3UJRsHbDalzQx84/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "Markdown"
        })
      });

      setStatus("success");
    } catch (error) {
      console.error("Error:", error);
      alert("Error booking test. Please try again.");
      setStatus("idle");
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border-t-4 border-green-500">
          <div className="text-green-500 text-5xl mb-4 text-center mx-auto">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-600 mb-6 font-medium text-center">Thank you, {name}. Your test is scheduled for {date}.</p>
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
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-blue-900 tracking-tight">Sri Balaji Diagnostics</h1>
          <p className="text-gray-600 mt-2 font-medium">Professional Lab Tests at Your Convenience</p>
        </header>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1 bg-white p-6 rounded-xl shadow-md border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm">1</span>
              Select Required Tests
            </h2>
            
            <input 
              type="text" 
              placeholder="🔍 Search for a test (e.g., Blood Sugar)..." 
              value={testSearch}
              onChange={(e) => setTestSearch(e.target.value)}
              className="w-full p-3 mb-6 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm"
            />

            <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2">
              {filteredTests.map(test => {
                const isSelected = selectedTests.find(t => t.id === test.id);
                return (
                  <div 
                    key={test.id} 
                    onClick={() => toggleTest(test)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all flex justify-between items-center group ${isSelected ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
                  >
                    <div>
                      <h3 className={`font-bold ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>{test.name}</h3>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">High Precision</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-gray-900 text-lg">₹{test.price}</span>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {isSelected && <span className="text-white text-xs">✓</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="w-full md:w-[400px] space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm">2</span>
                Patient Details
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Full Name</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Enter patient name" />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">WhatsApp Number</label>
                  <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="10-digit mobile number" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Preferred Date</label>
                  <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition" />
                </div>

                <div className="mt-8 bg-blue-900 p-5 rounded-xl text-white shadow-inner">
                  <h3 className="font-bold text-blue-200 text-xs uppercase tracking-widest mb-3 text-center">Booking Summary</h3>
                  <div className="text-sm space-y-2 mb-4 max-h-32 overflow-y-auto pr-2">
                    {selectedTests.length === 0 ? <p className="italic opacity-60 text-center">No tests selected.</p> : selectedTests.map(t => (
                      <div key={t.id} className="flex justify-between border-b border-blue-800 pb-1">
                        <span className="truncate mr-2 font-medium">{t.name}</span>
                        <span className="font-mono">₹{t.price}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-medium opacity-90">Total Amount</span>
                    <span className="text-2xl font-black italic">₹{totalAmount}</span>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={status === "loading"}
                  className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all shadow-lg ${status === "loading" ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0'}`}
                >
                  {status === "loading" ? "Confirming..." : "Confirm Booking Now"}
                </button>
              </form>
            </div>
            <p className="text-center text-xs text-gray-400 italic">© 2026 Sri Balaji Diagnostics | Quality Healthcare</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Booking;