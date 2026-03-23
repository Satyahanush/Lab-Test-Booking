import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

// === SET YOUR LAB LOCATION HERE ===
// Updated to Kothapeta coordinates
const LAB_LAT = 16.7162; 
const LAB_LNG = 81.8967; 
// ==================================

// The Haversine Formula to calculate distance between two GPS points in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function Booking() {
  const [availableTests, setAvailableTests] = useState([]);
  const [testSearch, setTestSearch] = useState("");
  const [selectedTests, setSelectedTests] = useState([]);
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  
  const [collectionType, setCollectionType] = useState("lab"); // "lab" or "home"
  const [patientAddress, setPatientAddress] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  
  // NEW DISTANCE & DELIVERY STATES
  const [deliveryCharge, setDeliveryCharge] = useState(50); // Default flat rate if they type manually
  const [serviceError, setServiceError] = useState("");
  const [calculatedDistance, setCalculatedDistance] = useState(null);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState({ text: "", type: "" });
  
  const [status, setStatus] = useState("idle"); 
  const [bookingId, setBookingId] = useState("");

  const timeSlots = [
    "06:00 AM - 08:00 AM",
    "08:00 AM - 10:00 AM",
    "10:00 AM - 12:00 PM",
    "12:00 PM - 02:00 PM",
    "02:00 PM - 04:00 PM",
    "04:00 PM - 06:00 PM",
    "06:00 PM - 08:00 PM"
  ];

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

  // Reset delivery charge and errors when switching collection type
  useEffect(() => {
    if (collectionType === "lab") {
      setServiceError("");
      setDeliveryCharge(0);
    } else if (collectionType === "home" && !calculatedDistance) {
      setDeliveryCharge(50); // Reset to default manual fee
    }
  }, [collectionType, calculatedDistance]);

  const toggleTest = (test) => {
    if (selectedTests.find(t => t.id === test.id)) {
      setSelectedTests(selectedTests.filter(t => t.id !== test.id));
    } else {
      setSelectedTests([...selectedTests, test]);
    }
  };

  const handleGetLocation = (e) => {
    e.preventDefault();
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    
    setIsLocating(true);
    setServiceError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const mapLink = `https://www.google.com/maps?q=$${lat},${lng}`;
        
        // 1. Calculate Distance
        const dist = calculateDistance(LAB_LAT, LAB_LNG, lat, lng);
        setCalculatedDistance(dist);

        // 2. Set Delivery Pricing Logic
        if (dist > 10) {
          setServiceError(`You are ${dist.toFixed(1)} km away. We only provide home collection within 10 km of our lab.`);
          setDeliveryCharge(0);
        } else if (dist <= 2) {
          setDeliveryCharge(20);
        } else if (dist <= 4) {
          setDeliveryCharge(30);
        } else {
          setDeliveryCharge(50); // 4km to 10km range
        }
        
        // 3. Update Address Box
        setPatientAddress((prev) => prev ? `${prev}\n\nMap Link: ${mapLink}` : `Map Link: ${mapLink}`);
        setIsLocating(false);
      },
      (error) => {
        alert("Unable to retrieve location. Please ensure location permissions are allowed.");
        setIsLocating(false);
      }
    );
  };

  const verifyCoupon = async () => {
    if (!couponInput) return;
    setCouponMessage({ text: "Checking...", type: "loading" });
    
    try {
      const snap = await getDocs(collection(db, "coupons"));
      const allCoupons = snap.docs.map(doc => doc.data());
      const foundCoupon = allCoupons.find(c => c.code === couponInput.toUpperCase().trim());
      
      if (foundCoupon) {
        setAppliedCoupon(foundCoupon);
        setCouponMessage({ text: `🎉 ${foundCoupon.code} applied! ${foundCoupon.discount}% Off`, type: "success" });
      } else {
        setAppliedCoupon(null);
        setCouponMessage({ text: "Invalid or expired coupon code.", type: "error" });
      }
    } catch (err) {
      setCouponMessage({ text: "Error checking coupon.", type: "error" });
    }
  };

  const filteredTests = availableTests.filter(t => 
    t.name?.toLowerCase().includes(testSearch.toLowerCase())
  );

  // FINANCIAL CALCULATIONS UPDATED WITH DELIVERY
  const subtotal = selectedTests.reduce((sum, test) => sum + (Number(test.price) || 0), 0);
  const discountAmount = appliedCoupon ? Math.round((subtotal * appliedCoupon.discount) / 100) : 0;
  const currentDeliveryCharge = collectionType === "home" ? deliveryCharge : 0;
  const finalTotal = subtotal - discountAmount + currentDeliveryCharge;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedTests.length === 0) return alert("Please select at least one test.");
    if (!timeSlot) return alert("Please select a preferred time slot.");
    if (collectionType === "home" && !patientAddress) return alert("Please provide an address for home collection.");
    if (serviceError) return alert("We cannot accept this booking because the address is out of our service area.");

    setStatus("loading");
    try {
      const docRef = await addDoc(collection(db, "bookings"), {
        name,
        phone,
        date,
        timeSlot,
        tests: selectedTests,
        subtotal: subtotal,
        discount: discountAmount,
        deliveryFee: currentDeliveryCharge,
        total: finalTotal,
        couponUsed: appliedCoupon ? appliedCoupon.code : null,
        status: "pending",
        collectionType, 
        address: collectionType === "home" ? patientAddress : "Lab Visit",
        createdAt: serverTimestamp()
      });
      
      const newBookingId = docRef.id.slice(0, 6).toUpperCase();
      setBookingId(newBookingId); 

      const TELEGRAM_BOT_TOKEN = "8688192298:AAG-iiHQJLq1iulo5PdI3UJRsHbDalzQx84"; 
      const TELEGRAM_CHAT_ID = "8703251648";
      
      const addressAlert = collectionType === "home" ? `\n*🏠 Home Collection:*\n${patientAddress}` : `\n*🏥 Type:* Lab Visit`;
      const couponAlert = appliedCoupon ? `\n*Discount:* -₹${discountAmount} (${appliedCoupon.code})` : "";
      const deliveryAlert = collectionType === "home" ? `\n*Delivery Fee:* +₹${currentDeliveryCharge}` : "";
      
      const message = `🚨 *New Lab Booking!*\n\n*ID:* ${newBookingId}\n*Patient:* ${name}\n*Phone:* ${phone}\n*Date:* ${date}\n*Time:* ${timeSlot}\n*Subtotal:* ₹${subtotal}${couponAlert}${deliveryAlert}\n*Total Paid:* ₹${finalTotal}${addressAlert}\n\n*Tests:* ${selectedTests.map(t => t.name).join(", ")}`;

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
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
          <p className="text-gray-600 mb-6 font-medium text-center">Thank you, {name}. Your test is scheduled for {date} between {timeSlot}.</p>
          <div className="bg-gray-100 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Your Booking ID</p>
            <p className="text-3xl font-mono font-bold text-blue-700">{bookingId}</p>
          </div>
          {collectionType === "home" && (
            <p className="text-sm text-blue-600 font-medium mb-6">Our technician will contact you shortly before arriving at your location.</p>
          )}
          <button onClick={() => window.location.reload()} className="text-blue-600 font-semibold hover:underline">Book Another Test</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 font-sans">
      <div className="max-w-5xl mx-auto">
        
        <header className="text-center mb-10 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
          <h1 className="text-4xl font-extrabold text-blue-900 tracking-tight mt-2">Sri Balaji Diagnostics</h1>
          <p className="text-gray-600 mt-2 font-medium">Professional Lab Tests & Home Collection</p>
          
          <div className="mt-5 flex flex-col md:flex-row items-center justify-center gap-4 text-sm text-gray-600 bg-gray-50 py-3 rounded-lg border border-gray-200 w-fit mx-auto px-6">
            <div className="flex items-center gap-2">
              <span className="text-lg">📍</span>
              {/* UPDATED ADDRESS HERE */}
              <span className="text-left md:text-center">Sathiraju complex, near Ganapathi Bhojanam hotel, Main road, Kothapeta</span>
            </div>
            <div className="hidden md:block w-px h-5 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <span className="text-lg">📞</span>
              <span className="font-semibold text-blue-700">+91 98765 43210</span>
            </div>
          </div>
        </header>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1 bg-white p-6 rounded-xl shadow-md border border-gray-100 h-fit">
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

          <div className="w-full md:w-[450px] space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm">2</span>
                Patient Details
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Full Name</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Enter patient name" />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">WhatsApp Number</label>
                  <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="10-digit number" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Date</label>
                    <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Time Slot</label>
                    <select required value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} className="w-full p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition">
                      <option value="" disabled>Select time</option>
                      {timeSlots.map((slot, index) => (
                        <option key={index} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-sm font-semibold text-gray-800 mb-3">Collection Method</label>
                  <div className="flex gap-4">
                    <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition ${collectionType === "lab" ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      <input type="radio" name="collection" value="lab" checked={collectionType === "lab"} onChange={() => setCollectionType("lab")} className="hidden" />
                      🏥 Visit Lab
                    </label>
                    <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition ${collectionType === "home" ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      <input type="radio" name="collection" value="home" checked={collectionType === "home"} onChange={() => setCollectionType("home")} className="hidden" />
                      🏠 Home Collection
                    </label>
                  </div>
                </div>

                {collectionType === "home" && (
                  <div className={`p-4 rounded-lg border transition-all ${serviceError ? 'bg-red-50 border-red-300' : 'bg-yellow-50 border-yellow-200'}`}>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">Collection Address</label>
                    <p className="text-xs text-gray-600 mb-2">Use GPS to automatically calculate your delivery fee.</p>
                    
                    <textarea 
                      required 
                      value={patientAddress} 
                      onChange={(e) => setPatientAddress(e.target.value)} 
                      className="w-full p-3 mb-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none transition" 
                      placeholder="e.g., Flat 202, Building A..." 
                      rows="3"
                    ></textarea>
                    
                    <button 
                      onClick={handleGetLocation} 
                      type="button"
                      disabled={isLocating}
                      className="w-full py-2 bg-white border border-blue-500 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isLocating ? "Calculating Distance..." : "📍 Auto-Detect My Location"}
                    </button>

                    {serviceError && (
                      <p className="mt-3 text-sm font-bold text-red-600 bg-white p-2 border border-red-200 rounded text-center">
                        ⚠️ {serviceError}
                      </p>
                    )}
                    {calculatedDistance && !serviceError && (
                      <p className="mt-3 text-sm font-bold text-green-700 bg-white p-2 border border-green-200 rounded text-center">
                        ✓ Distance: {calculatedDistance.toFixed(1)} km (Delivery: ₹{deliveryCharge})
                      </p>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">Have a Coupon Code?</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="e.g. SAVE20" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} className="flex-1 p-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none uppercase" />
                    <button type="button" onClick={verifyCoupon} className="bg-gray-900 text-white px-5 rounded-lg font-bold hover:bg-gray-800 transition shadow-sm">Apply</button>
                  </div>
                  {couponMessage.text && (
                    <p className={`text-sm mt-2 font-semibold ${couponMessage.type === "error" ? "text-red-500" : "text-green-600"}`}>
                      {couponMessage.text}
                    </p>
                  )}
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
                  
                  <div className="pt-2 space-y-1">
                    <div className="flex justify-between items-center text-sm text-blue-200">
                      <span>Subtotal</span>
                      <span>₹{subtotal}</span>
                    </div>
                    
                    {appliedCoupon && (
                      <div className="flex justify-between items-center text-sm text-green-400 font-bold">
                        <span>Discount ({appliedCoupon.code})</span>
                        <span>- ₹{discountAmount}</span>
                      </div>
                    )}

                    {collectionType === "home" && (
                      <div className="flex justify-between items-center text-sm text-orange-300 font-bold">
                        <span>Home Delivery Fee</span>
                        <span>+ ₹{currentDeliveryCharge}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-blue-700">
                      <span className="text-lg font-medium opacity-90">Total Payable</span>
                      <span className="text-2xl font-black italic text-green-400">₹{finalTotal}</span>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={status === "loading" || !!serviceError}
                  className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all shadow-lg ${status === "loading" || !!serviceError ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0'}`}
                >
                  {status === "loading" ? "Processing..." : "Confirm Booking Now"}
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