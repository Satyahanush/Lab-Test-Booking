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
  const [packages, setPackages] = useState([]);
  const [coupons, setCoupons] = useState([]);
  
  // Test Inputs
  const [testName, setTestName] = useState("");
  const [price, setPrice] = useState("");
  const [testDiscountedPrice, setTestDiscountedPrice] = useState("");
  const [testAllowCoupons, setTestAllowCoupons] = useState(true); // Default True

  // Package Inputs
  const [pkgName, setPkgName] = useState("");
  const [pkgIncludes, setPkgIncludes] = useState("");
  const [pkgPrice, setPkgPrice] = useState("");
  const [pkgDiscountedPrice, setPkgDiscountedPrice] = useState("");
  const [pkgAllowCoupons, setPkgAllowCoupons] = useState(false); // Default False to protect margins
  
  // Coupon Inputs
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");

  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

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
      alert("Login Failed. Please check your email and password.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const fetchData = async () => {
    const [snapBookings, snapTests, snapPackages, snapCoupons] = await Promise.all([
      getDocs(collection(db, "bookings")),
      getDocs(collection(db, "tests")),
      getDocs(collection(db, "packages")),
      getDocs(collection(db, "coupons"))
    ]);
    
    setBookings(snapBookings.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    setTests(snapTests.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setPackages(snapPackages.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setCoupons(snapCoupons.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

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

  const filterData = (data) => {
    return data.filter((b) => {
      const matchSearch = (b.name?.toLowerCase().includes(search.toLowerCase())) || (b.phone?.includes(search));
      const matchDate = !selectedDate || b.date === selectedDate;
      return matchSearch && matchDate;
    });
  };

  const formatAddress = (text) => {
    if (!text) return "No Address Provided";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded-full text-sm font-bold transition">
            📍 Open in Maps
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const todayBookings = filterData(bookings.filter(b => b.status !== "done"));
  const records = filterData(bookings.filter(b => b.status === "done"));

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-md w-96 border border-gray-200">
          <h2 className="text-2xl font-bold text-center text-blue-700 mb-6">Lab Admin Portal</h2>
          <input type="email" placeholder="Admin Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 mb-4 border rounded bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 mb-6 border rounded bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" required />
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 transition shadow">Secure Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        
        <div className="bg-blue-800 p-6 flex justify-between items-center text-white">
          <h2 className="text-2xl font-bold">Sri Balaji Diagnostics - Admin</h2>
          <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-sm font-semibold transition shadow">Logout</button>
        </div>

        <div className="flex border-b bg-gray-50 overflow-x-auto">
          <button onClick={() => setActiveTab("bookings")} className={`px-6 py-4 font-semibold whitespace-nowrap ${activeTab === "bookings" ? "text-blue-700 border-b-2 border-blue-700 bg-white" : "text-gray-500 hover:bg-gray-100"}`}>📋 Live Bookings ({todayBookings.length})</button>
          <button onClick={() => setActiveTab("tests")} className={`px-6 py-4 font-semibold whitespace-nowrap ${activeTab === "tests" ? "text-blue-700 border-b-2 border-blue-700 bg-white" : "text-gray-500 hover:bg-gray-100"}`}>🧪 Manage Tests</button>
          <button onClick={() => setActiveTab("packages")} className={`px-6 py-4 font-semibold whitespace-nowrap ${activeTab === "packages" ? "text-purple-700 border-b-2 border-purple-700 bg-white" : "text-gray-500 hover:bg-gray-100"}`}>✨ Health Packages</button>
          <button onClick={() => setActiveTab("coupons")} className={`px-6 py-4 font-semibold whitespace-nowrap ${activeTab === "coupons" ? "text-green-700 border-b-2 border-green-700 bg-white" : "text-gray-500 hover:bg-gray-100"}`}>🎟️ Promo Coupons</button>
          <button onClick={() => setActiveTab("records")} className={`px-6 py-4 font-semibold whitespace-nowrap ${activeTab === "records" ? "text-blue-700 border-b-2 border-blue-700 bg-white" : "text-gray-500 hover:bg-gray-100"}`}>📊 Past Records</button>
        </div>

        <div className="p-6">
          {(activeTab === "bookings" || activeTab === "records") && (
            <div className="flex flex-col md:flex-row gap-4 mb-6 bg-gray-50 p-4 rounded-lg border">
              <input type="text" placeholder="Search patient name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 p-3 border rounded outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="p-3 border rounded outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}

          {/* TAB: BOOKINGS */}
          {activeTab === "bookings" && (
            <div className="grid gap-6 md:grid-cols-2">
              {todayBookings.length === 0 ? <p className="text-gray-500 text-center col-span-2 py-8">No pending bookings found.</p> : todayBookings.map(b => (
                <div key={b.id} className="border border-gray-200 bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition relative overflow-hidden">
                  
                  <div className={`absolute top-0 left-0 w-full h-1.5 ${b.collectionType === "home" ? "bg-orange-400" : "bg-blue-500"}`}></div>

                  <div className="flex justify-between items-start mb-3 mt-1">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{b.name}</h3>
                      <p className="text-sm text-gray-600 font-medium mt-1">📞 {b.phone}</p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${b.collectionType === "home" ? "bg-orange-100 text-orange-800 border border-orange-200" : "bg-blue-100 text-blue-800 border border-blue-200"}`}>
                      {b.collectionType === "home" ? "🏠 Home Collection" : "🏥 Lab Visit"}
                    </span>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4 text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-500">Date:</span>
                      <span className="font-bold text-gray-800">{b.date || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Time:</span>
                      <span className="font-bold text-blue-700">{b.timeSlot || "Anytime"}</span>
                    </div>
                  </div>

                  {b.collectionType === "home" && (
                    <div className="mb-4 bg-orange-50 p-3 rounded-lg border border-orange-100 text-sm whitespace-pre-wrap text-gray-700">
                      <span className="font-bold text-orange-800 block mb-1">Address Details:</span>
                      {formatAddress(b.address)}
                    </div>
                  )}

                  <hr className="my-3 border-gray-100" />
                  
                  <div className="mb-3 text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <span className="font-bold text-blue-900 block mb-1">Items Booked:</span>
                    <ul className="list-disc list-inside text-gray-600">
                      {(b.cartItems || b.tests || []).map((item, idx) => (
                        <li key={idx} className="truncate">{item.name}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-5 border-l-4 border-gray-300 pl-3 space-y-1">
                     <div className="flex justify-between text-sm text-gray-500"><span>Subtotal:</span><span>₹{b.subtotal}</span></div>
                     {b.couponUsed && <div className="flex justify-between text-sm text-green-600 font-bold"><span>Discount ({b.couponUsed}):</span><span>- ₹{b.discount}</span></div>}
                     {b.deliveryFee > 0 && <div className="flex justify-between text-sm text-orange-600 font-bold"><span>Delivery Fee:</span><span>+ ₹{b.deliveryFee}</span></div>}
                     <p className="text-xl font-black text-gray-800 pt-1 mt-1 border-t border-gray-100">Total Paid: <span className="text-green-600">₹{b.total}</span></p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button onClick={() => markDone(b.id)} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg font-bold transition shadow-sm">✅ Mark Done</button>
                    <a href={`https://wa.me/91${b.phone}?text=Hello ${b.name}, your test booking at Sri Balaji Diagnostics is confirmed for ${b.date} between ${b.timeSlot}. Total amount to pay: ₹${b.total}.`} target="_blank" rel="noreferrer" className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 py-2.5 rounded-lg font-bold text-center transition">💬 WhatsApp</a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB: TESTS */}
          {activeTab === "tests" && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6 bg-blue-50 p-5 rounded-xl border border-blue-100 items-end shadow-sm">
                <div className="md:col-span-4">
                  <label className="block text-sm font-bold text-blue-800 mb-1">Test Name</label>
                  <input type="text" placeholder="e.g. Complete Blood Count" value={testName} onChange={(e) => setTestName(e.target.value)} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-blue-800 mb-1">MRP (₹)</label>
                  <input type="number" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-blue-800 mb-1">Offer Price (₹)</label>
                  <input type="number" placeholder="Optional" value={testDiscountedPrice} onChange={(e) => setTestDiscountedPrice(e.target.value)} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="md:col-span-2 flex flex-col items-center pb-3">
                  <label className="block text-sm font-bold text-blue-800 mb-2 text-center">Allow Coupons?</label>
                  <input type="checkbox" checked={testAllowCoupons} onChange={(e) => setTestAllowCoupons(e.target.checked)} className="w-6 h-6 cursor-pointer accent-blue-600" />
                </div>
                <div className="md:col-span-2">
                    <button onClick={addTest} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition shadow h-[50px]">Add Test</button>
                </div>
              </div>

              <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 text-sm uppercase tracking-wider">
                      <th className="p-4 border-b font-bold">Test Name</th>
                      <th className="p-4 border-b font-bold">Pricing</th>
                      <th className="p-4 border-b font-bold">Coupon Rules</th>
                      <th className="p-4 border-b text-right font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50 transition border-b border-gray-50 last:border-none">
                        <td className="p-4 font-medium text-gray-800">{t.name}</td>
                        <td className="p-4 text-gray-800">
                            {t.discountedPrice ? <><span className="line-through text-gray-400 text-sm mr-2">₹{t.price}</span><span className="font-bold text-green-600">₹{t.discountedPrice}</span></> : <span className="font-bold text-blue-700">₹{t.price}</span>}
                        </td>
                        <td className="p-4">
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${t.allowCoupons ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>{t.allowCoupons ? '✓ Allowed' : '🚫 Blocked'}</span>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => deleteDocument("tests", t.id)} className="text-red-500 hover:text-white hover:bg-red-500 border border-red-500 px-3 py-1 rounded text-sm font-bold transition">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: PACKAGES */}
          {activeTab === "packages" && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6 bg-purple-50 p-5 rounded-xl border border-purple-200 items-end shadow-sm">
                <div className="md:col-span-4">
                  <label className="block text-sm font-bold text-purple-900 mb-1">Package Name</label>
                  <input type="text" placeholder="e.g. Master Health Checkup" value={pkgName} onChange={(e) => setPkgName(e.target.value)} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div className="md:col-span-8">
                  <label className="block text-sm font-bold text-purple-900 mb-1">Tests Included (Comma Separated)</label>
                  <input type="text" placeholder="CBC, LFT, KFT, Thyroid Profile..." value={pkgIncludes} onChange={(e) => setPkgIncludes(e.target.value)} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                
                <div className="md:col-span-3">
                  <label className="block text-sm font-bold text-purple-900 mb-1">Total Value MRP (₹)</label>
                  <input type="number" placeholder="0" value={pkgPrice} onChange={(e) => setPkgPrice(e.target.value)} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-bold text-purple-900 mb-1">Package Offer Price (₹)</label>
                  <input type="number" placeholder="Required" value={pkgDiscountedPrice} onChange={(e) => setPkgDiscountedPrice(e.target.value)} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div className="md:col-span-3 flex flex-col items-center pb-3">
                  <label className="block text-sm font-bold text-purple-900 mb-2 text-center">Allow Extra Coupons?</label>
                  <input type="checkbox" checked={pkgAllowCoupons} onChange={(e) => setPkgAllowCoupons(e.target.checked)} className="w-6 h-6 cursor-pointer accent-purple-600" />
                </div>
                <div className="md:col-span-3">
                    <button onClick={addPackage} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-bold transition shadow h-[50px]">Create Package</button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {packages.map(p => (
                  <div key={p.id} className="bg-white border-2 border-purple-100 p-5 rounded-xl shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-black text-purple-900">{p.name}</h3>
                            <p className="text-xs text-gray-500 mt-1 mb-3">Includes: {p.includes}</p>
                        </div>
                        <button onClick={() => deleteDocument("packages", p.id)} className="text-red-400 hover:text-red-600 text-sm font-bold bg-red-50 px-2 py-1 rounded transition">Delete</button>
                    </div>
                    
                    <div className="flex justify-between items-end border-t border-gray-100 pt-3 mt-2">
                        <div>
                            {p.discountedPrice ? <><span className="line-through text-gray-400 text-sm mr-2">₹{p.price}</span><span className="font-black text-xl text-green-600">₹{p.discountedPrice}</span></> : <span className="font-black text-xl text-purple-900">₹{p.price}</span>}
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${p.allowCoupons ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{p.allowCoupons ? 'Extra Coupons Allowed' : 'No Extra Coupons'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: COUPONS */}
          {activeTab === "coupons" && (
            <div>
              <div className="flex flex-col md:flex-row gap-4 mb-6 bg-green-50 p-5 rounded-xl border border-green-200 items-end shadow-sm">
                <div className="flex-1 w-full">
                  <label className="block text-sm font-bold text-green-800 mb-1">Coupon Code (e.g. SAVE20)</label>
                  <input type="text" placeholder="Enter Code" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className="w-full p-3 border border-green-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 uppercase" />
                </div>
                <div className="w-full md:w-40">
                  <label className="block text-sm font-bold text-green-800 mb-1">Discount %</label>
                  <input type="number" placeholder="10" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} className="w-full p-3 border border-green-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <button onClick={addCoupon} className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold transition shadow h-[50px]">Create Coupon</button>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {coupons.map(c => (
                  <div key={c.id} className="bg-white border-2 border-dashed border-green-400 p-5 rounded-xl text-center relative">
                    <button onClick={() => deleteDocument("coupons", c.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-xl font-bold">×</button>
                    <p className="text-gray-500 text-sm font-medium uppercase tracking-widest mb-1">Code</p>
                    <h3 className="text-2xl font-black text-green-700 tracking-wider">{c.code}</h3>
                    <div className="mt-3 bg-green-100 text-green-800 inline-block px-4 py-1 rounded-full font-bold text-sm">
                      {c.discount}% OFF
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: RECORDS */}
          {activeTab === "records" && (
            <div className="grid gap-4 md:grid-cols-2">
               {records.length === 0 ? <p className="text-gray-500 text-center col-span-2 py-8">No completed records found.</p> : records.map(b => (
                <div key={b.id} className="border border-gray-200 bg-gray-50 p-5 rounded-xl shadow-sm opacity-90">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{b.name}</h3>
                      <p className="text-sm text-gray-600">Date: {b.date}</p>
                    </div>
                    <span className="bg-green-100 text-green-800 border border-green-200 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">✅ Completed</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2 font-medium">Items: <span className="font-normal text-gray-500">{(b.cartItems || b.tests || []).map(i => i.name).join(", ")}</span></p>
                  <p className="text-md font-bold text-gray-800 mb-4">Total Paid: <span className="text-green-600">₹{b.total}</span></p>
                  <a href={`https://wa.me/91${b.phone}?text=Hello ${b.name}, your lab test reports from Sri Balaji Diagnostics are ready. Please let us know if you need a digital copy.`} target="_blank" rel="noreferrer" className="block w-full bg-white border-2 border-green-500 text-green-600 hover:bg-green-50 py-2 rounded-lg font-bold text-center transition shadow-sm">Send Reports via WhatsApp</a>
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