import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, addDoc, getDoc, doc, serverTimestamp } from "firebase/firestore";

// Import our Component UI blocks
import BookingSelection from "./components/BookingSelection";
import CartSummary from "./components/CartSummary";

// ==========================================
// The Haversine Formula: Calculates exact straight-line distance in kilometers
// ==========================================
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; 
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
  
  // --- DYNAMIC SETTINGS FROM ADMIN PORTAL ---
  // We provide safe default values just in case the database hasn't loaded yet
  const [settings, setSettings] = useState({
    deliveryEnabled: true,
    maxDistance: 10,
    centers: [{ name: "Kothapeta Main Lab", lat: 16.7162, lng: 81.8967 }],
    tiers: [{ upTo: 2, fee: 20 }, { upTo: 4, fee: 30 }, { upTo: 10, fee: 50 }]
  });

  // --- USER INTERFACE STATES ---
  const [testSearch, setTestSearch] = useState("");
  const [cartItems, setCartItems] = useState([]); 
  
  // --- PATIENT FORM STATES ---
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [collectionType, setCollectionType] = useState("lab"); 
  const [patientAddress, setPatientAddress] = useState("");
  
  // --- LOCATION & DELIVERY STATES ---
  const [isLocating, setIsLocating] = useState(false);
  const [deliveryCharge, setDeliveryCharge] = useState(0); 
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

  // ==========================================
  // 1. INITIALIZATION: Fetch Data & Settings
  // ==========================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [snapTests, snapPackages, snapSettings] = await Promise.all([
          getDocs(collection(db, "tests")),
          getDocs(collection(db, "packages")),
          getDoc(doc(db, "settings", "general"))
        ]);
        
        setAvailableTests(snapTests.docs.map(doc => ({ id: doc.id, type: 'test', ...doc.data() })));
        setAvailablePackages(snapPackages.docs.map(doc => ({ id: doc.id, type: 'package', ...doc.data() })));
        
        if (snapSettings.exists()) {
            setSettings(snapSettings.data());
        }
      } catch (err) { 
        console.error("Error fetching database records:", err); 
      }
    };
    fetchData();
  }, []);

  // ==========================================
  // 2. CENTRALIZED DELIVERY PRICING ENGINE
  // ==========================================
  useEffect(() => {
    // If visiting lab, reset everything to 0
    if (collectionType === "lab") {
      setServiceError(""); 
      setDeliveryCharge(0);
    } 
    else if (collectionType === "home") {
      // If they haven't used GPS yet, apply a fallback flat rate (if delivery is enabled)
      if (calculatedDistance === null) {
        setDeliveryCharge(settings.deliveryEnabled ? 50 : 0); 
        setServiceError("");
      } 
      else {
        // Enforce the Admin's Maximum Distance Rule
        if (calculatedDistance > settings.maxDistance) {
          setServiceError(`You are ${calculatedDistance.toFixed(1)} km away. We only service within ${settings.maxDistance} km of our centers.`);
          setDeliveryCharge(0); // Set to 0 because booking is blocked anyway
        } 
        else {
          setServiceError("");
          
          // Apply "FREE DELIVERY" Master Override from Admin Portal
          if (!settings.deliveryEnabled) {
              setDeliveryCharge(0); 
          } 
          else {
              // Calculate dynamic fee based on Admin pricing tiers
              const sortedTiers = [...settings.tiers].sort((a,b) => a.upTo - b.upTo);
              
              // Default to the highest tier fee if they somehow fall between gaps
              let fee = sortedTiers[sortedTiers.length - 1]?.fee || 50; 
              
              for (let t of sortedTiers) {
                  if (calculatedDistance <= t.upTo) { 
                    fee = t.fee; 
                    break; 
                  }
              }
              setDeliveryCharge(fee);
          }
        }
      }
    }
  }, [collectionType, calculatedDistance, settings]);

  // ==========================================
  // 3. CART TOGGLE LOGIC
  // ==========================================
  const toggleItem = (item) => {
    setCartItems(prev => {
      if (prev.find(i => i.id === item.id)) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  // ==========================================
  // 4. MULTI-CENTER GPS LOGIC
  // ==========================================
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
        
        // Formatted exactly like your screenshot
        const mapLink = `https://www.google.com/maps?q=${lat},${lng}`;
        
        // Find distance to the CLOSEST active lab center
        let minDistance = Infinity;
        settings.centers.forEach(center => {
           const d = calculateDistance(center.lat, center.lng, lat, lng);
           if (d < minDistance) {
             minDistance = d;
           }
        });

        setCalculatedDistance(minDistance);
        
        // Append map link without erasing manually typed address
        setPatientAddress((prev) => prev ? `${prev}\n\nMap Link:\n${mapLink}` : `Map Link:\n${mapLink}`);
        setIsLocating(false);
      },
      (error) => { 
        alert("Unable to retrieve location. Please ensure GPS is turned on and permissions are allowed."); 
        setIsLocating(false); 
      }
    );
  };

  // ==========================================
  // 5. FINANCIAL CALCULATIONS (SWIGGY STYLE)
  // ==========================================
  const subtotal = cartItems.reduce((sum, item) => sum + (item.discountedPrice || item.price), 0);
  
  const couponEligibleSubtotal = cartItems.reduce((sum, item) => {
    return item.allowCoupons !== false ? sum + (item.discountedPrice || item.price) : sum;
  }, 0);
  
  const discountAmount = appliedCoupon ? Math.round((couponEligibleSubtotal * appliedCoupon.discount) / 100) : 0;
  const currentDeliveryCharge = collectionType === "home" ? deliveryCharge : 0;
  const finalTotal = subtotal - discountAmount + currentDeliveryCharge;

  // Verify Coupon
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
          setCouponMessage({ text: "Coupon applied, but items aren't eligible for discounts.", type: "warning" });
        } else {
          setCouponMessage({ text: `🎉 ${foundCoupon.code} applied! ${foundCoupon.discount}% Off eligible items`, type: "success" });
        }
      } else { 
        setAppliedCoupon(null); 
        setCouponMessage({ text: "Invalid or expired code.", type: "error" }); 
      }
    } catch (err) { 
      setCouponMessage({ text: "Error checking coupon.", type: "error" }); 
    }
  };

  // Recalculate coupon message if cart changes
  useEffect(() => {
    if (appliedCoupon) {
      if (couponEligibleSubtotal === 0 && cartItems.length > 0) {
        setCouponMessage({ text: "Coupon applied, but items aren't eligible for discounts.", type: "warning" });
      } else {
        setCouponMessage({ text: `🎉 ${appliedCoupon.code} applied! ${appliedCoupon.discount}% Off eligible items`, type: "success" });
      }
    }
  }, [cartItems, appliedCoupon, couponEligibleSubtotal]);

  // ==========================================
  // 6. FORM SUBMISSION & TELEGRAM ALERT
  // ==========================================
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
        cartItems: cartItems, 
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

      // Send Telegram Alert
      const TELEGRAM_BOT_TOKEN = "8688192298:AAG-iiHQJLq1iulo5PdI3UJRsHbDalzQx84"; 
      const TELEGRAM_CHAT_ID = "8703251648";
      
      const addressAlert = collectionType === "home" ? `\n*🏠 Home Collection:*\n${patientAddress}` : `\n*🏥 Type:* Lab Visit`;
      const couponAlert = appliedCoupon && discountAmount > 0 ? `\n*Discount:* -₹${discountAmount} (${appliedCoupon.code})` : "";
      
      // Conditionally format delivery fee in Telegram based on settings
      let deliveryAlert = "";
      if (collectionType === "home") {
          deliveryAlert = `\n*Delivery Fee:* ${settings.deliveryEnabled && currentDeliveryCharge > 0 ? `+₹${currentDeliveryCharge}` : "FREE"}`;
      }
      
      const message = `🚨 *New Lab Booking!*\n\n*ID:* ${newBookingId}\n*Patient:* ${name}\n*Phone:* ${phone}\n*Date:* ${date}\n*Time:* ${timeSlot}\n*Subtotal:* ₹${subtotal}${couponAlert}${deliveryAlert}\n*Total Paid:* ₹${finalTotal}${addressAlert}\n\n*Items Booked:*\n${cartItems.map(item => `• ${item.name}`).join("\n")}`;
      
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "Markdown" }) 
      });

      setStatus("success");
    } catch (error) { 
      console.error("Booking Error:", error);
      alert("Error booking test. Please try again."); 
      setStatus("idle"); 
    }
  };

  // ==========================================
  // RENDER: SUCCESS SCREEN
  // ==========================================
  if (status === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-center font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border-t-8 border-green-500">
          <div className="text-green-500 text-6xl mb-6">✅</div>
          <h2 className="text-3xl font-black text-gray-800 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-600 mb-6 font-medium text-lg">Thank you, {name}. Your test is scheduled for {date} between {timeSlot}.</p>
          
          <div className="bg-gray-50 p-6 rounded-xl mb-6 border border-gray-200 shadow-inner">
            <p className="text-sm text-gray-500 uppercase tracking-widest font-bold mb-2">Your Booking ID</p>
            <p className="text-4xl font-mono font-black text-blue-700 tracking-wider">{bookingId}</p>
          </div>
          
          {collectionType === "home" && (
            <p className="text-sm text-blue-700 font-bold mb-8 bg-blue-50 p-4 rounded-xl border border-blue-200">
              Our technician will contact you on WhatsApp shortly before arriving at your location.
            </p>
          )}
          
          <button onClick={() => window.location.reload()} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg transition-transform hover:-translate-y-1">
            Book Another Test
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: MAIN APP UI
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <header className="text-center mb-10 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-blue-900 mt-2 tracking-tight">Sri Balaji Diagnostics</h1>
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
          
          {/* LEFT SIDE: SELECTION AREA (Imported Component) */}
          <BookingSelection 
            availablePackages={availablePackages} 
            availableTests={availableTests} 
            cartItems={cartItems} 
            toggleItem={toggleItem} 
            testSearch={testSearch} 
            setTestSearch={setTestSearch} 
          />

          {/* RIGHT SIDE: CHECKOUT FORM */}
          <div className="w-full lg:w-[450px] space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-md border border-gray-100 sticky top-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">Patient Details</h2>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Personal Inputs */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Full Name</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium outline-none transition" placeholder="Enter patient name" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">WhatsApp Number</label>
                  <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium outline-none transition" placeholder="10-digit number" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Date</label>
                    <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium outline-none transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Time Slot</label>
                    <select required value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium outline-none transition">
                      <option value="" disabled>Select time</option>
                      {timeSlots.map((slot, index) => <option key={index} value={slot}>{slot}</option>)}
                    </select>
                  </div>
                </div>

                {/* Collection Method Toggle */}
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-sm font-bold text-gray-800 mb-3">Collection Method</label>
                  <div className="flex gap-4">
                    <label className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      collectionType === "lab" ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>
                      <input type="radio" value="lab" checked={collectionType === "lab"} onChange={() => setCollectionType("lab")} className="hidden" />
                      <span className="text-2xl mb-1">🏥</span>
                      <span className={`font-bold text-sm ${collectionType === "lab" ? 'text-blue-800' : ''}`}>Visit Lab</span>
                    </label>
                    
                    <label className={`flex-1 flex flex-col items-center justify-center gap-1 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      collectionType === "home" ? 'border-blue-600 bg-blue-50 shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>
                      <input type="radio" value="home" checked={collectionType === "home"} onChange={() => setCollectionType("home")} className="hidden" />
                      <span className="text-2xl mb-1">🏠</span>
                      <span className={`font-bold text-sm ${collectionType === "home" ? 'text-blue-800' : ''}`}>Home Visit</span>
                    </label>
                  </div>
                </div>

                {/* GPS Address Block */}
                {collectionType === "home" && (
                  <div className={`p-5 rounded-xl border-2 transition-colors ${
                    serviceError ? 'bg-red-50 border-red-300' : 'bg-yellow-50 border-yellow-200 shadow-inner'
                  }`}>
                    <label className="block text-sm font-bold text-gray-800 mb-1">Collection Address</label>
                    <p className="text-xs text-gray-600 mb-3 font-medium">Use GPS to automatically calculate your delivery fee.</p>
                    
                    <textarea required value={patientAddress} onChange={(e) => setPatientAddress(e.target.value)} className="w-full p-3.5 mb-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium outline-none" rows="3" placeholder="e.g. Flat 202, Building A..."></textarea>
                    
                    <button onClick={handleGetLocation} type="button" disabled={isLocating} className="w-full py-3.5 bg-white border-2 border-blue-500 text-blue-600 rounded-xl font-black shadow-sm hover:bg-blue-50 transition flex items-center justify-center gap-2">
                      {isLocating ? "Calculating Route..." : "📍 Auto-Detect My Location"}
                    </button>
                    
                    {serviceError && (
                      <p className="mt-4 text-sm font-bold text-red-700 bg-white p-3 border border-red-200 rounded-lg text-center shadow-sm">
                        ⚠️ {serviceError}
                      </p>
                    )}
                    
                    {calculatedDistance && !serviceError && (
                      <p className={`mt-4 text-sm font-bold bg-white p-3 border rounded-lg text-center shadow-sm flex items-center justify-center gap-2 ${
                        settings.deliveryEnabled && currentDeliveryCharge > 0 ? 'text-green-700 border-green-200' : 'text-blue-700 border-blue-200'
                      }`}>
                        <span>✓</span> Distance: {calculatedDistance.toFixed(1)} km 
                        <span className="ml-1 opacity-80">
                          {settings.deliveryEnabled && currentDeliveryCharge > 0 ? `(Fee: ₹${deliveryCharge})` : '(Free Delivery Active)'}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {/* Promo Code Box */}
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-sm font-bold text-gray-800 mb-2">Have a Promo Code?</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="e.g. SAVE20" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} className="flex-1 p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none uppercase font-bold tracking-wider" />
                    <button type="button" onClick={verifyCoupon} className="bg-gray-900 text-white px-6 rounded-xl font-bold hover:bg-gray-800 transition shadow-sm">
                      Apply
                    </button>
                  </div>
                  
                  {couponMessage.text && (
                    <p className={`text-sm mt-3 font-bold bg-white p-2.5 rounded-lg border text-center shadow-sm ${
                      couponMessage.type === "error" ? "text-red-600 border-red-200" : 
                      couponMessage.type === "warning" ? "text-orange-600 border-orange-200" : 
                      "text-green-700 border-green-200"
                    }`}>
                      {couponMessage.text}
                    </p>
                  )}
                </div>

                {/* IMPORTED CART COMPONENT */}
                <CartSummary 
                  cartItems={cartItems} 
                  subtotal={subtotal} 
                  appliedCoupon={appliedCoupon} 
                  discountAmount={discountAmount} 
                  collectionType={collectionType} 
                  currentDeliveryCharge={currentDeliveryCharge} 
                  finalTotal={finalTotal} 
                  deliveryEnabled={settings.deliveryEnabled} 
                />

                {/* Submit Button */}
                <button type="submit" disabled={status === "loading" || !!serviceError} className={`w-full py-5 rounded-2xl font-black text-white text-xl shadow-xl transition-all flex justify-center items-center gap-2 ${
                  status === "loading" || !!serviceError ? 'bg-gray-500 cursor-not-allowed opacity-80' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-1'
                }`}>
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