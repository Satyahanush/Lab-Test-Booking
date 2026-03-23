import React, { useEffect, useState } from "react";
import { db, auth } from "./firebase";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

function Admin() {
  // --- AUTHENTICATION STATES ---
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // --- DASHBOARD STATES ---
  const [activeTab, setActiveTab] = useState("bookings");
  const [bookings, setBookings] = useState([]);
  const [tests, setTests] = useState([]);
  const [packages, setPackages] = useState([]);
  const [coupons, setCoupons] = useState([]);
  
  // --- DELIVERY LOGISTICS ENGINE STATES ---
  const [settings, setSettings] = useState({
    deliveryEnabled: true,
    maxDistance: 10,
    centers: [
      { id: Date.now(), name: "Kothapeta Main Lab", lat: 16.7162, lng: 81.8967 }
    ],
    tiers: [
      { id: 1, upTo: 2, fee: 20 },
      { id: 2, upTo: 4, fee: 30 },
      { id: 3, upTo: 10, fee: 50 }
    ]
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // --- FORM INPUT STATES ---
  // Tests
  const [testName, setTestName] = useState("");
  const [price, setPrice] = useState("");
  const [testDiscountedPrice, setTestDiscountedPrice] = useState("");
  const [testAllowCoupons, setTestAllowCoupons] = useState(true);

  // Packages
  const [pkgName, setPkgName] = useState("");
  const [pkgIncludes, setPkgIncludes] = useState("");
  const [pkgPrice, setPkgPrice] = useState("");
  const [pkgDiscountedPrice, setPkgDiscountedPrice] = useState("");
  const [pkgAllowCoupons, setPkgAllowCoupons] = useState(false);
  
  // Coupons
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  // --- INITIALIZATION ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchData();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try { 
      await signInWithEmailAndPassword(auth, email, password); 
    } catch (error) { 
      alert("Login Failed. Please check credentials."); 
    }
  };

  const fetchData = async () => {
    try {
      const [snapBookings, snapTests, snapPackages, snapCoupons, snapSettings] = await Promise.all([
        getDocs(collection(db, "bookings")),
        getDocs(collection(db, "tests")),
        getDocs(collection(db, "packages")),
        getDocs(collection(db, "coupons")),
        getDoc(doc(db, "settings", "general"))
      ]);
      
      setBookings(snapBookings.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setTests(snapTests.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setPackages(snapPackages.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setCoupons(snapCoupons.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      if (snapSettings.exists()) {
        setSettings(snapSettings.data());
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  // --- SETTINGS LOGIC ---
  const saveSettings = async () => {
    try {
      await setDoc(doc(db, "settings", "general"), settings);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (error) {
      alert("Error saving settings. Please check Firebase rules.");
    }
  };

  const updateSetting = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };
  
  // Collection Centers Logic
  const addCenter = () => {
    setSettings({ 
      ...settings, 
      centers: [...settings.centers, { id: Date.now(), name: "", lat: 0, lng: 0 }] 
    });
  };
  const updateCenter = (index, field, val) => {
    const newCenters = [...settings.centers];
    newCenters[index][field] = field === "name" ? val : Number(val);
    setSettings({ ...settings, centers: newCenters });
  };
  const removeCenter = (index) => {
    setSettings({ 
      ...settings, 
      centers: settings.centers.filter((_, i) => i !== index) 
    });
  };

  // Pricing Tiers Logic
  const addTier = () => {
    setSettings({ 
      ...settings, 
      tiers: [...settings.tiers, { id: Date.now(), upTo: 0, fee: 0 }] 
    });
  };
  const updateTier = (index, field, val) => {
    const newTiers = [...settings.tiers];
    newTiers[index][field] = Number(val);
    setSettings({ ...settings, tiers: newTiers });
  };
  const removeTier = (index) => {
    setSettings({ 
      ...settings, 
      tiers: settings.tiers.filter((_, i) => i !== index) 
    });
  };

  // --- CRUD LOGIC ---
  const addTest = async () => {
    if (!testName || !price) return;
    await addDoc(collection(db, "tests"), { 
      name: testName, 
      price: Number(price), 
      discountedPrice: testDiscountedPrice ? Number(testDiscountedPrice) : null, 
      allowCoupons: testAllowCoupons, 
      createdAt: serverTimestamp() 
    });
    setTestName(""); setPrice(""); setTestDiscountedPrice(""); setTestAllowCoupons(true); 
    fetchData();
  };

  const addPackage = async () => {
    if (!pkgName || !pkgPrice || !pkgIncludes) return;
    await addDoc(collection(db, "packages"), { 
      name: pkgName, 
      includes: pkgIncludes, 
      price: Number(pkgPrice), 
      discountedPrice: pkgDiscountedPrice ? Number(pkgDiscountedPrice) : null, 
      allowCoupons: pkgAllowCoupons, 
      createdAt: serverTimestamp() 
    });
    setPkgName(""); setPkgIncludes(""); setPkgPrice(""); setPkgDiscountedPrice(""); setPkgAllowCoupons(false); 
    fetchData();
  };

  const addCoupon = async () => {
    if (!couponCode || !discountPercent) return;
    await addDoc(collection(db, "coupons"), { 
      code: couponCode.toUpperCase().trim(), 
      discount: Number(discountPercent), 
      createdAt: serverTimestamp() 
    });
    setCouponCode(""); setDiscountPercent(""); 
    fetchData();
  };

  const deleteDocument = async (col, id) => {
    if(window.confirm("Are you sure you want to delete this?")) { 
      await deleteDoc(doc(db, col, id)); 
      fetchData(); 
    }
  };

  const markDone = async (id) => { 
    await updateDoc(doc(db, "bookings", id), { status: "done" }); 
    fetchData(); 
  };

  const formatAddress = (text) => {
    if (!text) return "No Address Provided";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded-full text-sm font-bold transition">
            📍 Open Map
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Filter Bookings & Records
  const filterData = (data) => {
    return data.filter((b) => {
      const matchSearch = (b.name?.toLowerCase().includes(search.toLowerCase())) || (b.phone?.includes(search));
      const matchDate = !selectedDate || b.date === selectedDate;
      return matchSearch && matchDate;
    });
  };

  const todayBookings = filterData(bookings.filter(b => b.status !== "done"));
  const records = filterData(bookings.filter(b => b.status === "done"));

  // --- LOGIN SCREEN ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl w-96 border border-gray-100">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-blue-900">Admin Portal</h2>
            <p className="text-gray-500 text-sm mt-2">Sri Balaji Diagnostics</p>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
              <input type="email" placeholder="admin@lab.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3.5 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 transition" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3.5 border rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 transition" required />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl transition shadow-lg mt-4">
              Secure Login
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- MAIN DASHBOARD ---
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-blue-900 p-6 flex flex-col md:flex-row justify-between items-center text-white gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-wide">Sri Balaji Diagnostics</h2>
            <p className="text-blue-200 text-sm font-medium">Management Dashboard</p>
          </div>
          <button onClick={() => signOut(auth)} className="bg-red-500 hover:bg-red-600 px-6 py-2.5 rounded-lg text-sm font-bold transition shadow">
            Logout
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto custom-scrollbar">
          <button onClick={() => setActiveTab("bookings")} className={`px-6 py-5 font-bold whitespace-nowrap transition-colors ${activeTab === "bookings" ? "text-blue-700 border-b-4 border-blue-700 bg-white" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}>
            📋 Live Bookings ({todayBookings.length})
          </button>
          <button onClick={() => setActiveTab("tests")} className={`px-6 py-5 font-bold whitespace-nowrap transition-colors ${activeTab === "tests" ? "text-blue-700 border-b-4 border-blue-700 bg-white" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}>
            🧪 Manage Tests
          </button>
          <button onClick={() => setActiveTab("packages")} className={`px-6 py-5 font-bold whitespace-nowrap transition-colors ${activeTab === "packages" ? "text-purple-700 border-b-4 border-purple-700 bg-white" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}>
            ✨ Health Packages
          </button>
          <button onClick={() => setActiveTab("coupons")} className={`px-6 py-5 font-bold whitespace-nowrap transition-colors ${activeTab === "coupons" ? "text-green-700 border-b-4 border-green-700 bg-white" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}>
            🎟️ Promo Coupons
          </button>
          <button onClick={() => setActiveTab("settings")} className={`px-6 py-5 font-bold whitespace-nowrap transition-colors ${activeTab === "settings" ? "text-orange-600 border-b-4 border-orange-600 bg-white" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}>
            ⚙️ Delivery Engine
          </button>
          <button onClick={() => setActiveTab("records")} className={`px-6 py-5 font-bold whitespace-nowrap transition-colors ${activeTab === "records" ? "text-blue-700 border-b-4 border-blue-700 bg-white" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}>
            📊 Past Records
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-6 md:p-8">
          
          {/* Global Search Bar (Only for Bookings & Records) */}
          {(activeTab === "bookings" || activeTab === "records") && (
            <div className="flex flex-col md:flex-row gap-4 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-3 text-gray-400">🔍</span>
                <input type="text" placeholder="Search by patient name or phone number..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full p-3 pl-10 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
              </div>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700" />
            </div>
          )}

          {/* ========================================= */}
          {/* TAB: DELIVERY SETTINGS ENGINE             */}
          {/* ========================================= */}
          {activeTab === "settings" && (
            <div className="space-y-8 max-w-4xl mx-auto">
              
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-gray-800">Logistics & Dispatch</h2>
                <p className="text-gray-500 mt-2 font-medium">Control where you collect samples and how much you charge based on GPS distance.</p>
              </div>

              {/* Master Toggle */}
              <div className="bg-gradient-to-r from-orange-50 to-white p-8 rounded-2xl border-2 border-orange-200 shadow-md flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200 rounded-full blur-3xl opacity-30"></div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-black text-orange-900">Enable Paid Home Delivery?</h3>
                  <p className="text-sm text-orange-700 mt-2 font-medium max-w-md">
                    If turned OFF, all distance calculations are bypassed. The patient will see a "FREE" delivery badge at checkout regardless of where they live.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer z-10">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={settings.deliveryEnabled} 
                    onChange={(e) => updateSetting("deliveryEnabled", e.target.checked)} 
                  />
                  <div className="w-16 h-8 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500 shadow-inner"></div>
                </label>
              </div>

              {/* Collection Centers (Locations) */}
              <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-4">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">📍 Collection Centers (Labs)</h3>
                  <button onClick={addCenter} className="bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 transition shadow-sm">
                    + Add New Center
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-6 font-medium">
                  Add all your physical lab locations here. When a patient requests home collection, the system automatically calculates the delivery fee based on the distance from the <b>closest</b> active center to their home.
                </p>
                
                {settings.centers.map((c, idx) => (
                  <div key={c.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 items-center bg-gray-50 p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition">
                    <div className="md:col-span-5">
                      <label className="text-xs font-bold text-gray-500 mb-1 block">Branch Name</label>
                      <input type="text" value={c.name} onChange={e => updateCenter(idx, "name", e.target.value)} placeholder="e.g. Kothapeta Main" className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-xs font-bold text-gray-500 mb-1 block">Latitude</label>
                      <input type="number" value={c.lat} onChange={e => updateCenter(idx, "lat", e.target.value)} placeholder="16.7162" className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-xs font-bold text-gray-500 mb-1 block">Longitude</label>
                      <input type="number" value={c.lng} onChange={e => updateCenter(idx, "lng", e.target.value)} placeholder="81.8967" className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <button onClick={() => removeCenter(idx)} disabled={settings.centers.length === 1} className="text-red-500 hover:text-white hover:bg-red-500 p-2 rounded transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-red-500">
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pricing Tiers & Max Distance */}
              <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">📏 Distance Limits & Pricing Tiers</h3>
                  <button onClick={addTier} className="bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 transition shadow-sm">
                    + Add Pricing Tier
                  </button>
                </div>
                
                {/* Max Distance */}
                <div className="mb-8 bg-red-50 p-5 rounded-xl border border-red-100 flex justify-between items-center shadow-inner">
                  <div>
                    <span className="font-black text-red-900 text-lg block">Maximum Serviceable Distance</span>
                    <span className="text-xs text-red-700 font-medium mt-1 block">Patients further than this will be blocked from booking home collection entirely.</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-red-200 shadow-sm">
                    <input type="number" value={settings.maxDistance} onChange={(e) => updateSetting("maxDistance", Number(e.target.value))} className="w-20 p-2 border-none outline-none font-black text-xl text-center text-red-700" />
                    <span className="font-bold text-gray-500 pr-2">km</span>
                  </div>
                </div>

                {/* Tiers List */}
                <div className="space-y-4">
                  {settings.tiers.sort((a,b) => a.upTo - b.upTo).map((t, idx) => (
                    <div key={t.id} className="flex flex-wrap md:flex-nowrap gap-4 items-center bg-gray-50 p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition">
                      <span className="font-bold text-gray-600 w-32">Distance up to</span>
                      <div className="flex items-center gap-2">
                        <input type="number" value={t.upTo} onChange={e => updateTier(idx, "upTo", e.target.value)} className="w-24 p-3 border rounded-lg text-center font-black text-blue-700 outline-none focus:ring-2 focus:ring-blue-500" />
                        <span className="font-bold text-gray-500">km</span>
                      </div>
                      <span className="font-bold text-gray-400 text-xl mx-2">=</span>
                      <span className="font-bold text-gray-600 w-24">Delivery Fee</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-500">₹</span>
                        <input type="number" value={t.fee} onChange={e => updateTier(idx, "fee", e.target.value)} className="w-28 p-3 border rounded-lg text-center font-black text-green-700 outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                      <button onClick={() => removeTier(idx)} className="ml-auto text-red-500 hover:text-white hover:bg-red-500 px-3 py-2 rounded font-bold transition">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <button 
                onClick={saveSettings} 
                className={`w-full py-5 rounded-2xl font-black text-xl transition-all shadow-xl flex justify-center items-center gap-3 ${
                  settingsSaved 
                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/30' 
                    : 'bg-gray-900 hover:bg-black text-white hover:-translate-y-1'
                }`}
              >
                {settingsSaved ? "✅ Logistics System Updated Successfully!" : "💾 Save & Deploy Logistics Configuration"}
              </button>
            </div>
          )}

          {/* ========================================= */}
          {/* TAB: LIVE BOOKINGS                        */}
          {/* ========================================= */}
          {activeTab === "bookings" && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              {todayBookings.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-gray-300">
                  <p className="text-gray-500 font-medium text-lg">No pending bookings match your search.</p>
                </div>
              ) : (
                todayBookings.map((b) => (
                  <div key={b.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition-shadow relative overflow-hidden flex flex-col">
                    
                    {/* Top Color Bar */}
                    <div className={`absolute top-0 left-0 w-full h-1.5 ${b.collectionType === "home" ? "bg-orange-500" : "bg-blue-600"}`}></div>
                    
                    {/* Header: Name & Type Badge */}
                    <div className="flex justify-between items-start mb-4 mt-1">
                      <div>
                        <h3 className="text-2xl font-black text-gray-900 leading-tight">{b.name}</h3>
                        <p className="text-sm text-gray-600 font-medium mt-1 flex items-center gap-1">📞 {b.phone}</p>
                      </div>
                      <span className={`text-xs font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-sm ${
                        b.collectionType === "home" ? "bg-orange-100 text-orange-800 border border-orange-200" : "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}>
                        {b.collectionType === "home" ? "🏠 Home Collection" : "🏥 Lab Visit"}
                      </span>
                    </div>
                    
                    {/* Scheduling Details */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4 flex justify-between items-center text-sm shadow-inner">
                      <div>
                        <span className="text-gray-500 block text-xs font-bold uppercase tracking-wider mb-1">Scheduled Date</span>
                        <span className="font-bold text-gray-900 text-base">{b.date || "N/A"}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500 block text-xs font-bold uppercase tracking-wider mb-1">Time Slot</span>
                        <span className="font-black text-blue-700 text-base">{b.timeSlot || "Anytime"}</span>
                      </div>
                    </div>

                    {/* Address Block */}
                    {b.collectionType === "home" && (
                      <div className="mb-4 bg-orange-50 p-4 rounded-xl border border-orange-100 text-sm whitespace-pre-wrap text-gray-800 shadow-inner">
                        <span className="font-black text-orange-900 block mb-2 uppercase tracking-wide text-xs">Patient Address:</span>
                        <div className="font-medium leading-relaxed">
                          {formatAddress(b.address)}
                        </div>
                      </div>
                    )}

                    <hr className="my-2 border-gray-100" />
                    
                    {/* Items List */}
                    <div className="my-4 flex-1">
                      <span className="font-black text-gray-800 block mb-2 text-sm uppercase tracking-wide">Tests to Conduct:</span>
                      <ul className="space-y-1 bg-white border border-gray-100 rounded-lg p-3">
                        {(b.cartItems || b.tests || []).map((item, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-gray-700 font-medium text-sm">
                            <span className="text-blue-500">•</span> {item.name}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Financial Summary */}
                    <div className="mb-6 bg-gray-900 p-5 rounded-xl text-white shadow-md">
                       <h4 className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-3 border-b border-gray-700 pb-2">Payment Details</h4>
                       <div className="space-y-2">
                         <div className="flex justify-between text-sm text-gray-300">
                           <span>Item Subtotal:</span>
                           <span className="font-mono">₹{b.subtotal}</span>
                         </div>
                         {b.couponUsed && (
                           <div className="flex justify-between text-sm text-green-400 font-bold bg-green-900/30 p-1.5 rounded -mx-1.5 px-1.5">
                             <span>Discount ({b.couponUsed}):</span>
                             <span className="font-mono">- ₹{b.discount}</span>
                           </div>
                         )}
                         {b.deliveryFee > 0 && (
                           <div className="flex justify-between text-sm text-yellow-400 font-bold bg-yellow-900/20 p-1.5 rounded -mx-1.5 px-1.5">
                             <span>Delivery Fee:</span>
                             <span className="font-mono">+ ₹{b.deliveryFee}</span>
                           </div>
                         )}
                         <div className="flex justify-between text-xl font-black pt-3 mt-1 border-t border-gray-700">
                           <span>Total Received:</span> 
                           <span className="text-white font-mono">₹{b.total}</span>
                         </div>
                       </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-auto">
                      <button onClick={() => markDone(b.id)} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-xl font-black transition-all shadow-md hover:-translate-y-0.5 active:translate-y-0">
                        ✅ Mark Complete
                      </button>
                      <a 
                        href={`https://wa.me/91${b.phone}?text=Hello ${b.name}, your test booking at Sri Balaji Diagnostics is confirmed for ${b.date} between ${b.timeSlot}. Total amount to pay: ₹${b.total}.`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex-1 bg-white hover:bg-gray-50 text-gray-800 border-2 border-gray-200 py-3.5 rounded-xl font-black text-center transition-all shadow-sm flex items-center justify-center gap-2 hover:border-gray-300"
                      >
                        💬 WhatsApp
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ========================================= */}
          {/* TAB: MANAGE TESTS                         */}
          {/* ========================================= */}
          {activeTab === "tests" && (
            <div>
              {/* Add New Test Form */}
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 shadow-sm mb-8">
                <h3 className="text-lg font-black text-blue-900 mb-4 flex items-center gap-2">➕ Add New Lab Test</h3>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
                  <div className="md:col-span-4">
                    <label className="block text-sm font-bold text-blue-800 mb-1.5">Test Name</label>
                    <input type="text" placeholder="e.g. Complete Blood Count" value={testName} onChange={(e) => setTestName(e.target.value)} className="w-full p-3.5 border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-blue-800 mb-1.5">MRP Price (₹)</label>
                    <input type="number" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-3.5 border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-blue-800 mb-1.5">Offer Price (₹)</label>
                    <input type="number" placeholder="Optional" value={testDiscountedPrice} onChange={(e) => setTestDiscountedPrice(e.target.value)} className="w-full p-3.5 border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                  </div>
                  <div className="md:col-span-2 flex flex-col items-center pb-3">
                    <label className="block text-sm font-bold text-blue-800 mb-2 text-center">Allow Coupons?</label>
                    <input type="checkbox" checked={testAllowCoupons} onChange={(e) => setTestAllowCoupons(e.target.checked)} className="w-6 h-6 cursor-pointer accent-blue-600" />
                  </div>
                  <div className="md:col-span-2">
                      <button onClick={addTest} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-black transition shadow-md hover:-translate-y-0.5 active:translate-y-0">
                        Save Test
                      </button>
                  </div>
                </div>
              </div>

              {/* Tests Table */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 text-sm uppercase tracking-wider border-b border-gray-200">
                      <th className="p-5 font-black">Test Name</th>
                      <th className="p-5 font-black">Pricing</th>
                      <th className="p-5 font-black">Coupon Rules</th>
                      <th className="p-5 text-right font-black">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map(t => (
                      <tr key={t.id} className="hover:bg-blue-50/50 transition border-b border-gray-100 last:border-none">
                        <td className="p-5 font-bold text-gray-800 text-lg">{t.name}</td>
                        <td className="p-5 text-gray-800">
                            {t.discountedPrice ? (
                              <div className="flex items-center gap-2">
                                <span className="line-through text-gray-400 text-sm font-medium">₹{t.price}</span>
                                <span className="font-black text-green-600 text-lg tracking-tight">₹{t.discountedPrice}</span>
                              </div>
                            ) : (
                              <span className="font-black text-blue-800 text-lg tracking-tight">₹{t.price}</span>
                            )}
                        </td>
                        <td className="p-5">
                            <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${
                              t.allowCoupons ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-orange-100 text-orange-800 border border-orange-200'
                            }`}>
                              {t.allowCoupons ? '✓ Coupons Allowed' : '🚫 Blocked'}
                            </span>
                        </td>
                        <td className="p-5 text-right">
                          <button onClick={() => deleteDocument("tests", t.id)} className="text-red-500 hover:text-white hover:bg-red-500 border-2 border-red-200 hover:border-red-500 px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================= */}
          {/* TAB: HEALTH PACKAGES                      */}
          {/* ========================================= */}
          {activeTab === "packages" && (
            <div>
              {/* Add New Package Form */}
              <div className="bg-purple-50 p-6 rounded-2xl border border-purple-200 shadow-sm mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-200 rounded-full blur-3xl opacity-40"></div>
                <h3 className="text-lg font-black text-purple-900 mb-4 flex items-center gap-2 relative z-10">✨ Create Health Package</h3>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end relative z-10">
                  <div className="md:col-span-4">
                    <label className="block text-sm font-bold text-purple-900 mb-1.5">Package Name</label>
                    <input type="text" placeholder="e.g. Master Health Checkup" value={pkgName} onChange={(e) => setPkgName(e.target.value)} className="w-full p-3.5 border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-medium" />
                  </div>
                  <div className="md:col-span-8">
                    <label className="block text-sm font-bold text-purple-900 mb-1.5">Tests Included (Comma Separated)</label>
                    <input type="text" placeholder="CBC, LFT, KFT, Thyroid Profile..." value={pkgIncludes} onChange={(e) => setPkgIncludes(e.target.value)} className="w-full p-3.5 border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-medium" />
                  </div>
                  
                  <div className="md:col-span-3">
                    <label className="block text-sm font-bold text-purple-900 mb-1.5">Total Value MRP (₹)</label>
                    <input type="number" placeholder="0" value={pkgPrice} onChange={(e) => setPkgPrice(e.target.value)} className="w-full p-3.5 border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-medium" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-bold text-purple-900 mb-1.5">Package Offer Price (₹)</label>
                    <input type="number" placeholder="Required" value={pkgDiscountedPrice} onChange={(e) => setPkgDiscountedPrice(e.target.value)} className="w-full p-3.5 border border-purple-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-medium" />
                  </div>
                  <div className="md:col-span-3 flex flex-col items-center pb-3">
                    <label className="block text-sm font-bold text-purple-900 mb-2 text-center">Allow Extra Coupons?</label>
                    <input type="checkbox" checked={pkgAllowCoupons} onChange={(e) => setPkgAllowCoupons(e.target.checked)} className="w-6 h-6 cursor-pointer accent-purple-600" />
                  </div>
                  <div className="md:col-span-3">
                      <button onClick={addPackage} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3.5 rounded-xl font-black transition shadow-md hover:-translate-y-0.5 active:translate-y-0">
                        Create Package
                      </button>
                  </div>
                </div>
              </div>

              {/* Packages List */}
              <div className="grid gap-6 md:grid-cols-2">
                {packages.map(p => (
                  <div key={p.id} className="bg-white border-2 border-purple-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500"></div>
                    
                    <div className="flex justify-between items-start mb-4 pl-2">
                        <div>
                            <h3 className="text-2xl font-black text-purple-900 leading-tight">{p.name}</h3>
                            <span className={`inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                              p.allowCoupons ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                            }`}>
                              {p.allowCoupons ? '✓ Extra Coupons Allowed' : '🚫 No Extra Coupons'}
                            </span>
                        </div>
                        <button onClick={() => deleteDocument("packages", p.id)} className="text-red-500 hover:text-white hover:bg-red-500 text-sm font-bold border-2 border-red-100 hover:border-red-500 px-3 py-1.5 rounded-lg transition">
                          Delete
                        </button>
                    </div>
                    
                    <div className="pl-2 flex-1 mb-4">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Includes:</span>
                      <p className="text-sm text-gray-700 font-medium leading-relaxed">{p.includes}</p>
                    </div>
                    
                    <div className="pl-2 flex justify-between items-end border-t border-purple-100 pt-4 mt-auto">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Pricing:</span>
                            {p.discountedPrice ? (
                              <div className="flex items-center gap-2">
                                <span className="line-through text-gray-400 text-sm font-medium">₹{p.price}</span>
                                <span className="font-black text-3xl text-green-600 tracking-tight">₹{p.discountedPrice}</span>
                              </div>
                            ) : (
                              <span className="font-black text-3xl text-purple-900 tracking-tight">₹{p.price}</span>
                            )}
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================= */}
          {/* TAB: PROMO COUPONS                        */}
          {/* ========================================= */}
          {activeTab === "coupons" && (
            <div>
              <div className="flex flex-col md:flex-row gap-5 mb-8 bg-green-50 p-6 rounded-2xl border border-green-200 shadow-sm items-end relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-200 rounded-full blur-3xl opacity-40"></div>
                <div className="flex-1 w-full relative z-10">
                  <label className="block text-sm font-bold text-green-900 mb-1.5">Coupon Code (e.g. SAVE20)</label>
                  <input type="text" placeholder="Enter Code" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className="w-full p-3.5 border border-green-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 uppercase font-bold tracking-wider" />
                </div>
                <div className="w-full md:w-48 relative z-10">
                  <label className="block text-sm font-bold text-green-900 mb-1.5">Discount %</label>
                  <input type="number" placeholder="10" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} className="w-full p-3.5 border border-green-300 rounded-xl outline-none focus:ring-2 focus:ring-green-500 font-black text-green-700" />
                </div>
                <button onClick={addCoupon} className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-10 py-3.5 rounded-xl font-black transition shadow-md hover:-translate-y-0.5 active:translate-y-0 relative z-10">
                  Create Coupon
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {coupons.map(c => (
                  <div key={c.id} className="bg-white border-2 border-dashed border-green-400 p-6 rounded-2xl text-center relative hover:shadow-lg transition group">
                    <button onClick={() => deleteDocument("coupons", c.id)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition text-xl font-bold leading-none">
                      ×
                    </button>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Promo Code</p>
                    <h3 className="text-3xl font-black text-green-700 tracking-wider">{c.code}</h3>
                    <div className="mt-4 bg-green-100 border border-green-200 text-green-800 inline-block px-4 py-1.5 rounded-full font-black text-sm shadow-sm group-hover:bg-green-600 group-hover:text-white transition-colors">
                      {c.discount}% OFF
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================= */}
          {/* TAB: PAST RECORDS                         */}
          {/* ========================================= */}
          {activeTab === "records" && (
            <div className="grid gap-6 md:grid-cols-2">
               {records.length === 0 ? (
                 <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-gray-300">
                   <p className="text-gray-500 font-medium text-lg">No completed records found.</p>
                 </div>
               ) : (
                 records.map(b => (
                  <div key={b.id} className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-black text-gray-800">{b.name}</h3>
                        <p className="text-sm text-gray-500 font-medium mt-1">Date: {b.date}</p>
                      </div>
                      <span className="bg-green-50 text-green-700 border border-green-200 text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
                        ✅ Completed
                      </span>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Tests Conducted:</span>
                      <p className="text-sm text-gray-700 font-medium leading-relaxed">
                        {(b.cartItems || b.tests || []).map(i => i.name).join(" • ")}
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-end border-t border-gray-100 pt-4 mb-5">
                      <span className="text-sm font-bold text-gray-500">Total Paid:</span>
                      <span className="text-2xl font-black text-gray-900 tracking-tight">₹{b.total}</span>
                    </div>
                    
                    <a 
                      href={`https://wa.me/91${b.phone}?text=Hello ${b.name}, your lab test reports from Sri Balaji Diagnostics are ready. Please let us know if you need a digital copy.`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="block w-full bg-white border-2 border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 py-3 rounded-xl font-black text-center transition shadow-sm"
                    >
                      Send Reports via WhatsApp
                    </a>
                  </div>
                ))
               )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Admin;