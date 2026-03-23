import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

// Import our new Component UI blocks
import BookingSelection from "./components/BookingSelection";
import CartSummary from "./components/CartSummary";

// === SET YOUR LAB LOCATION HERE ===
const LAB_LAT = 16.7162; 
const LAB_LNG = 81.8967; 
// ==================================

// The Haversine Formula: Calculates exact straight-line distance in kilometers
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
  const [deliveryCharge, setDeliveryCharge] = useState(50); 
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

  // 2. BULLETPROOF DISTANCE & DELIVERY LOGIC
  // This constantly monitors changes to fix the State-Leak bug
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
          setDeliveryCharge(0); 
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
      setCartItems(cartItems.filter(i => i.id !== item.id)); 
    } else {
      setCartItems([...cartItems, item]); 
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
        const mapLink = `https://www.google.com/maps?q=${lat},${lng}`;
        
        // This triggers the useEffect above to instantly calculate pricing or block them
        const dist = calculateDistance(LAB_LAT, LAB_LNG, lat, lng);
        setCalculatedDistance(dist);
        
        // Append map link without erasing their typed address
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
  
  const subtotal = cartItems.reduce((sum, item) => sum + (item.discountedPrice || item.price), 0);
  
  // Calculate discount ONLY on items where allowCoupons !== false
  const couponEligibleSubtotal = cartItems.reduce((sum, item) => {
    return item.allowCoupons !== false ? sum + (item.discountedPrice || item.price) : sum;
  }, 0);
  
  const discountAmount = appliedCoupon ? Math.round((couponEligibleSubtotal * appliedCoupon.discount) / 100) : 0;
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

  // ==========================================
  // SUCCESS SCREEN RENDER
  // ==========================================
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

  // ==========================================
  // MAIN APP RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
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
          
          {/* LEFT SIDE: SELECTION AREA (IMPORTED COMPONENT) */}
          <BookingSelection 
             availablePackages={availablePackages} 
             availableTests={availableTests} 
             cartItems={cartItems} 
             toggleItem={toggleItem} 
             testSearch={testSearch} 
             setTestSearch={setTestSearch} 
          />

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