import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

// === SET YOUR LAB LOCATION HERE ===
// Exact coordinates for Sathiraju complex, Kothapeta
const LAB_LAT = 16.7162; 
const LAB_LNG = 81.8967; 
// ==================================

// The Haversine Formula: Calculates exact straight-line distance between two GPS coordinates in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function Booking() {
  // --- DATABASE STATES ---
  const [availableTests, setAvailableTests] = useState([]);
  const [availablePackages, setAvailablePackages] = useState([]);
  
  // --- USER INTERFACE STATES ---
  const [testSearch, setTestSearch] = useState("");
  const [cartItems, setCartItems] = useState([]); // Unified cart for tests & packages
  
  // --- PATIENT FORM STATES ---
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [collectionType, setCollectionType] = useState("lab"); // Default to lab visit
  const [patientAddress, setPatientAddress] = useState("");
  
  // --- LOCATION & DELIVERY STATES ---
  const [isLocating, setIsLocating] = useState(false);
  const [deliveryCharge, setDeliveryCharge] = useState(50); // Default flat rate if manually typed
  const [serviceError, setServiceError] = useState("");
  const [calculatedDistance, setCalculatedDistance] = useState(null);

  // --- COUPON STATES ---
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState({ text: "", type: "" });
  
  // --- SUBMISSION STATES ---
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

  // 1. Fetch data from Firebase on page load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [snapTests, snapPackages] = await Promise.all([
          getDocs(collection(db, "tests")),
          getDocs(collection(db, "packages"))
        ]);
        setAvailableTests(snapTests.docs.map(doc => ({ id: doc.id, type: 'test', ...doc.data() })));
        setAvailablePackages(snapPackages.docs.map(doc => ({ id: doc.id, type: 'package', ...doc.data() })));
      } catch (err) {
        console.error("Error fetching database records:", err);
      }
    };
    fetchData();
  }, []);

  // 2. BULLETPROOF DISTANCE & DELIVERY LOGIC (Fixes the state-leaking bug)
  // This constantly monitors changes so a user can't trick the system by switching tabs
  useEffect(() => {
    if (collectionType === "lab") {
      setServiceError("");
      setDeliveryCharge(0);
    } else if (collectionType === "home") {
      if (calculatedDistance === null) {
        // They haven't used GPS yet, assume flat rate manual address
        setDeliveryCharge(50); 
        setServiceError("");
      } else {
        // They used GPS, enforce strict radius limits
        if (calculatedDistance > 10) {
          setServiceError(`You are ${calculatedDistance.toFixed(1)} km away. We only provide home collection within 10 km of our lab.`);
          setDeliveryCharge(0); // Set to 0 because booking will be blocked anyway
        } else {
          setServiceError("");
          if (calculatedDistance <= 2) setDeliveryCharge(20);
          else if (calculatedDistance <= 4) setDeliveryCharge(30);
          else setDeliveryCharge(50);
        }
      }
    }
  }, [collectionType, calculatedDistance]);

  // 3. Add or remove items from the unified Swiggy-style cart
  const toggleItem = (item) => {
    if (cartItems.find(i => i.id === item.id)) {
      setCartItems(cartItems.filter(i => i.id !== item.id)); // Remove if exists
    } else {
      setCartItems([...cartItems, item]); // Add if doesn't exist
    }
  };

  // 4. Handle GPS Location Tracking
  const handleGetLocation = (e) => {
    e.preventDefault();
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        // Standard Google Maps format
        const mapLink = `https://www.google.com/maps?q=${lat},${lng}`;
        
        // This triggers the useEffect above to instantly calculate pricing or block them
        const dist = calculateDistance(LAB_LAT, LAB_LNG, lat, lng);
        setCalculatedDistance(dist);
        
        // Append map link without erasing their typed address (if any)
        setPatientAddress((prev) => prev ? `${prev}\n\nMap Link: ${mapLink}` : `Map Link: ${mapLink}`);
        setIsLocating(false);
      },
      (error) => {
        alert("Unable to retrieve location. Please ensure GPS is turned on and permissions are allowed.");
        setIsLocating(false);
      }
    );
  };

  // ==========================================
  // SWIGGY/ZOMATO STYLE FINANCIAL CALCULATIONS
  // ==========================================
  
  // Total cost of all items in cart (using discounted flat price if available)
  const subtotal = cartItems.reduce((sum, item) => sum + (item.discountedPrice || item.price), 0);
  
  // Total cost of ONLY the items that explicitly allow extra coupons (allowCoupons !== false)
  const couponEligibleSubtotal = cartItems.reduce((sum, item) => {
    return item.allowCoupons !== false ? sum + (item.discountedPrice || item.price) : sum;
  }, 0);
  
  // Calculate discount amount strictly on the eligible subtotal
  const discountAmount = appliedCoupon ? Math.round((couponEligibleSubtotal * appliedCoupon.discount) / 100) : 0;
  
  // Final Math combining everything
  const currentDeliveryCharge = collectionType === "home" ? deliveryCharge : 0;
  const finalTotal = subtotal - discountAmount + currentDeliveryCharge;

  // Verify Coupon against Firebase database
  const verifyCoupon = async () => {
    if (!couponInput) return;
    setCouponMessage({ text: "Checking...", type: "loading" });
    
    try {
      const snap = await getDocs(collection(db, "coupons"));
      const allCoupons = snap.docs.map(doc => doc.data());
      const foundCoupon = allCoupons.find(c => c.code === couponInput.toUpperCase().trim());
      
      if (foundCoupon) {
        setAppliedCoupon(foundCoupon);
        if (couponEligibleSubtotal === 0 && cartItems.length > 0) {
          setCouponMessage({ text: "Coupon applied, but current items don't allow extra discounts.", type: "warning" });
        } else {
          setCouponMessage({ text: `🎉 ${foundCoupon.code} applied! ${foundCoupon.discount}% Off eligible items`, type: "success" });
        }
      } else {
        setAppliedCoupon(null);
        setCouponMessage({ text: "Invalid or expired coupon code.", type: "error" });
      }
    } catch (err) {
      setCouponMessage({ text: "Error checking coupon.", type: "error" });
    }
  };

  // Recalculate warning message dynamically if patient adds/removes items AFTER applying a coupon
  useEffect(() => {
    if (appliedCoupon) {
        if (couponEligibleSubtotal === 0 && cartItems.length > 0) {
            setCouponMessage({ text: "Coupon applied, but current items don't allow extra discounts.", type: "warning" });
        } else {
            setCouponMessage({ text: `🎉 ${appliedCoupon.code} applied! ${appliedCoupon.discount}% Off eligible items`, type: "success" });
        }
    }
  }, [cartItems, appliedCoupon, couponEligibleSubtotal]);

  // Search filter for individual tests
  const filteredTests = availableTests.filter(t => 
    t.name?.toLowerCase().includes(testSearch.toLowerCase())
  );

  // 5. Submit the final booking to Firebase & Telegram
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return alert("Please select at least one test or package.");
    if (!timeSlot) return alert("Please select a preferred time slot.");
    if (collectionType === "home" && !patientAddress) return alert("Please provide an address for home collection.");
    if (serviceError) return alert("We cannot accept this booking because the address is out of our service area.");

    setStatus("loading");
    try {
      // Create Database Record
      const docRef = await addDoc(collection(db, "bookings"), {
        name,
        phone,
        date,
        timeSlot,
        cartItems: cartItems, // Save the entire cart object
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

      // Send Instant Telegram Alert to Admin
      const TELEGRAM_BOT_TOKEN = "8688192298:AAG-iiHQJLq1iulo5PdI3UJRsHbDalzQx84"; 
      const TELEGRAM_CHAT_ID = "8703251648";
      
      const addressAlert = collectionType === "home" ? `\n*🏠 Home Collection:*\n${patientAddress}` : `\n*🏥 Type:* Lab Visit`;
      const couponAlert = appliedCoupon && discountAmount > 0 ? `\n*Discount:* -₹${discountAmount} (${appliedCoupon.code})` : "";
      const deliveryAlert = collectionType === "home" ? `\n*Delivery Fee:* +₹${currentDeliveryCharge}` : "";
      
      const message = `🚨 *New Lab Booking!*\n\n*ID:* ${newBookingId}\n*Patient:* ${name}\n*Phone:* ${phone}\n*Date:* ${date}\n*Time:* ${timeSlot}\n*Subtotal:* ₹${subtotal}${couponAlert}${deliveryAlert}\n*Total Paid:* ₹${finalTotal}${addressAlert}\n\n*Items Booked:*\n${cartItems.map(item => `• ${item.name}`).join("\n")}`;

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
      console.error("Error saving booking:", error);
      alert("Error booking test. Please try again or call us directly.");
      setStatus("idle");
    }
  };

  // SUCCESS SCREEN RENDER
  if (status === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full border-t-4 border-green-500">
          <div className="text-green-500 text-6xl mb-4 text-center mx-auto">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-600 mb-6 font-medium text-center">Thank you, {name}. Your test is scheduled for {date} between {timeSlot}.</p>
          
          <div className="bg-gray-100 p-5 rounded-lg mb-6 border border-gray-200">
            <p className="text-sm text-gray-500 uppercase tracking-widest font-bold mb-1">Your Booking ID</p>
            <p className="text-4xl font-mono font-black text-blue-700 tracking-wider">{bookingId}</p>
          </div>
          
          {collectionType === "home" && (
            <p className="text-sm text-blue-600 font-medium mb-8 bg-blue-50 p-3 rounded-lg border border-blue-100">
              Our technician will contact you on your WhatsApp number shortly before arriving at your location.
            </p>
          )}
          
          <button onClick={() => window.location.reload()} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-md">
            Book Another Test
          </button>
        </div>
      </div>
    );
  }

  // MAIN APP RENDER
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER SECTION */}
        <header className="text-center mb-10 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-900 tracking-tight mt-2">Sri Balaji Diagnostics</h1>
          <p className="text-gray-600 mt-3 font-medium text-lg">Professional Lab Tests & Home Collection</p>
          
          <div className="mt-6 flex flex-col md:flex-row items-center justify-center gap-4 text-sm text-gray-600 bg-gray-50 py-3 rounded-xl border border-gray-200 w-fit mx-auto px-8 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="text-xl">📍</span>
              <span className="text-left md:text-center font-medium">Sathiraju complex, near Ganapathi Bhojanam hotel, Main road, Kothapeta</span>
            </div>
            <div className="hidden md:block w-px h-6 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📞</span>
              <span className="font-black text-blue-700 text-base">+91 9849923729</span>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* LEFT SIDE: SELECTION AREA (PACKAGES & TESTS) */}
          <div className="flex-1 space-y-8">
            
            {/* HEALTH PACKAGES MODULE */}
            {availablePackages.length > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-white p-6 md:p-8 rounded-2xl shadow-md border border-purple-100 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full blur-3xl opacity-50"></div>
                 <h2 className="text-2xl font-bold text-purple-900 mb-6 flex items-center gap-2 relative z-10">
                    ✨ Exclusive Health Packages
                 </h2>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
                    {availablePackages.map(pkg => {
                        const isSelected = cartItems.find(i => i.id === pkg.id);
                        return (
                            <div key={pkg.id} onClick={() => toggleItem(pkg)} className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 relative ${isSelected ? 'border-purple-600 bg-purple-100 shadow-md scale-[1.02]' : 'border-purple-200 bg-white hover:border-purple-400 hover:shadow-md'}`}>
                                
                                {pkg.discountedPrice && (
                                  <div className="absolute -top-3 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-md tracking-wide">
                                    SPECIAL OFFER
                                  </div>
                                )}
                                
                                <h3 className="font-black text-purple-900 text-xl leading-tight">{pkg.name}</h3>
                                
                                {!pkg.allowCoupons && (
                                  <span className="inline-block mt-2 text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 uppercase font-bold tracking-wider">
                                    No extra coupons
                                  </span>
                                )}
                                
                                <p className="text-sm text-gray-600 mt-3 mb-5 line-clamp-3 leading-relaxed">Includes: {pkg.includes}</p>
                                
                                <div className="flex justify-between items-end border-t border-purple-200/50 pt-4 mt-auto">
                                    <div>
                                        {pkg.discountedPrice ? (
                                          <>
                                            <span className="text-sm text-gray-400 line-through block -mb-1 font-medium">₹{pkg.price}</span> 
                                            <span className="font-black text-3xl text-green-600 tracking-tight">₹{pkg.discountedPrice}</span>
                                          </>
                                        ) : (
                                          <span className="font-black text-3xl text-purple-900 tracking-tight">₹{pkg.price}</span>
                                        )}
                                    </div>
                                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-purple-600 border-purple-600 shadow-inner' : 'border-gray-300 bg-gray-50'}`}>
                                        {isSelected && <span className="text-white text-sm font-bold">✓</span>}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                 </div>
              </div>
            )}

            {/* INDIVIDUAL TESTS MODULE */}
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-md border border-gray-100 h-fit">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                🧪 Individual Tests
              </h2>
              
              <div className="relative mb-6">
                <span className="absolute left-4 top-3.5 text-gray-400 text-lg">🔍</span>
                <input 
                  type="text" 
                  placeholder="Search for a test (e.g., Blood Sugar)..." 
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  className="w-full p-4 pl-12 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition shadow-inner font-medium"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredTests.length === 0 ? (
                   <p className="text-center text-gray-500 py-8 italic">No tests found matching your search.</p>
                ) : filteredTests.map(test => {
                  const isSelected = cartItems.find(t => t.id === test.id);
                  return (
                    <div 
                      key={test.id} 
                      onClick={() => toggleItem(test)}
                      className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center group ${isSelected ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-gray-100 hover:border-blue-300 hover:bg-gray-50'}`}
                    >
                      <div className="flex-1 pr-4">
                        <h3 className={`font-bold text-lg leading-tight ${isSelected ? 'text-blue-800' : 'text-gray-800'}`}>{test.name}</h3>
                        {!test.allowCoupons && (
                          <span className="inline-block mt-1 text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 uppercase font-bold tracking-wider">
                            No extra coupons
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="text-right">
                            {test.discountedPrice ? (
                              <>
                                <span className="text-xs text-gray-400 line-through block -mb-1 font-medium">₹{test.price}</span> 
                                <span className="font-black text-xl text-green-600">₹{test.discountedPrice}</span>
                              </>
                            ) : (
                              <span className="font-black text-gray-900 text-xl">₹{test.price}</span>
                            )}
                        </div>
                        <div className={`w-7 h-7 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                          {isSelected && <span className="text-white text-sm font-bold">✓</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: CHECKOUT FORM & CART */}
          <div className="w-full lg:w-[450px] space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-md border border-gray-100 sticky top-8">
              
              <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">
                Patient Details
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Personal Info */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Full Name</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition font-medium text-gray-800" placeholder="Enter patient name" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">WhatsApp Number</label>
                  <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition font-medium text-gray-800" placeholder="10-digit number" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Date</label>
                    <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition font-medium text-gray-800" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Time Slot</label>
                    <select required value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition font-medium text-gray-800">
                      <option value="" disabled>Select time</option>
                      {timeSlots.map((slot, index) => (
                        <option key={index} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Collection Method Toggle */}
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-sm font-bold text-gray-800 mb-3">Collection Method</label>
                  <div className="flex gap-4">
                    <label className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${collectionType === "lab" ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      <input type="radio" name="collection" value="lab" checked={collectionType === "lab"} onChange={() => setCollectionType("lab")} className="hidden" />
                      <span className="text-2xl mb-1">🏥</span>
                      <span className={`font-bold text-sm ${collectionType === "lab" ? 'text-blue-800' : ''}`}>Visit Lab</span>
                    </label>
                    
                    <label className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${collectionType === "home" ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      <input type="radio" name="collection" value="home" checked={collectionType === "home"} onChange={() => setCollectionType("home")} className="hidden" />
                      <span className="text-2xl mb-1">🏠</span>
                      <span className={`font-bold text-sm ${collectionType === "home" ? 'text-blue-800' : ''}`}>Home Visit</span>
                    </label>
                  </div>
                </div>

                {/* GPS Address Block */}
                {collectionType === "home" && (
                  <div className={`p-5 rounded-xl border-2 transition-all ${serviceError ? 'bg-red-50 border-red-300' : 'bg-yellow-50 border-yellow-200 shadow-inner'}`}>
                    <label className="block text-sm font-bold text-gray-800 mb-1">Collection Address</label>
                    <p className="text-xs text-gray-600 mb-3 font-medium">Use GPS to automatically calculate your delivery fee.</p>
                    
                    <textarea 
                      required 
                      value={patientAddress} 
                      onChange={(e) => setPatientAddress(e.target.value)} 
                      className="w-full p-3.5 mb-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none transition font-medium text-gray-800" 
                      placeholder="e.g., Flat 202, Building A..." 
                      rows="3"
                    ></textarea>
                    
                    <button 
                      onClick={handleGetLocation} 
                      type="button"
                      disabled={isLocating}
                      className="w-full py-3 bg-white border-2 border-blue-500 text-blue-600 rounded-xl font-black hover:bg-blue-50 transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isLocating ? "Calculating Distance..." : "📍 Auto-Detect My Location"}
                    </button>

                    {serviceError && (
                      <p className="mt-4 text-sm font-bold text-red-700 bg-white p-3 border border-red-200 rounded-lg text-center shadow-sm">
                        ⚠️ {serviceError}
                      </p>
                    )}
                    {calculatedDistance && !serviceError && (
                      <p className="mt-4 text-sm font-bold text-green-700 bg-white p-3 border border-green-200 rounded-lg text-center shadow-sm flex items-center justify-center gap-2">
                        <span>✓</span> Distance: {calculatedDistance.toFixed(1)} km (Delivery Fee: ₹{deliveryCharge})
                      </p>
                    )}
                  </div>
                )}

                {/* Promo Code Block */}
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-sm font-bold text-gray-800 mb-2">Have a Promo Code?</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="e.g. SAVE20" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} className="flex-1 p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none uppercase font-bold text-gray-800 tracking-wider" />
                    <button type="button" onClick={verifyCoupon} className="bg-gray-900 text-white px-6 rounded-xl font-bold hover:bg-gray-800 transition shadow-sm">Apply</button>
                  </div>
                  {couponMessage.text && (
                    <p className={`text-sm mt-3 font-bold bg-white p-2 rounded border text-center ${couponMessage.type === "error" ? "text-red-600 border-red-200" : couponMessage.type === "warning" ? "text-orange-600 border-orange-200" : "text-green-700 border-green-200"}`}>
                      {couponMessage.text}
                    </p>
                  )}
                </div>

                {/* SWIGGY STYLE CART SUMMARY */}
                <div className="mt-8 bg-gray-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
                  
                  <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest mb-4 border-b border-gray-700 pb-3 relative z-10">Bill Summary</h3>
                  
                  <div className="space-y-4 mb-5 max-h-48 overflow-y-auto pr-2 custom-scrollbar relative z-10">
                    {cartItems.length === 0 ? (
                        <p className="italic opacity-50 text-sm text-center py-2">Your cart is empty.</p>
                    ) : cartItems.map(item => (
                      <div key={item.id} className="pb-1">
                        <div className="flex justify-between text-sm items-start">
                          <span className="font-medium pr-3 leading-tight">{item.name}</span>
                          <span className="font-mono font-bold">₹{item.discountedPrice || item.price}</span>
                        </div>
                        {item.allowCoupons === false && appliedCoupon && (
                            <p className="text-[10px] text-orange-400 italic mt-1 font-medium">* Coupon not applicable on this item</p>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-4 space-y-3 border-t border-gray-700 relative z-10">
                    <div className="flex justify-between items-center text-sm text-gray-300">
                      <span>Item Total</span>
                      <span className="font-mono">₹{subtotal}</span>
                    </div>
                    
                    {appliedCoupon && discountAmount > 0 && (
                      <div className="flex justify-between items-center text-sm text-green-400 font-bold bg-green-900/30 p-2 rounded -mx-2 px-2">
                        <span>Coupon Discount ({appliedCoupon.code})</span>
                        <span className="font-mono">- ₹{discountAmount}</span>
                      </div>
                    )}

                    {collectionType === "home" && (
                      <div className="flex justify-between items-center text-sm text-yellow-400 font-bold bg-yellow-900/20 p-2 rounded -mx-2 px-2">
                        <span>Home Delivery Fee</span>
                        <span className="font-mono">+ ₹{currentDeliveryCharge}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-4 mt-2 border-t border-gray-700">
                      <span className="text-xl font-bold text-white uppercase tracking-wider">To Pay</span>
                      <span className="text-3xl font-black text-white">₹{finalTotal}</span>
                    </div>
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button 
                  type="submit" 
                  disabled={status === "loading" || !!serviceError}
                  className={`w-full py-5 rounded-2xl font-black text-white text-xl transition-all shadow-xl ${status === "loading" || !!serviceError ? 'bg-gray-500 cursor-not-allowed opacity-80' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 active:translate-y-0'}`}
                >
                  {status === "loading" ? "Processing Security..." : "Confirm Booking Securely"}
                </button>
              </form>
            </div>
            
            <p className="text-center text-xs text-gray-400 font-medium">© 2026 Sri Balaji Diagnostics | Kothapeta</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Booking;