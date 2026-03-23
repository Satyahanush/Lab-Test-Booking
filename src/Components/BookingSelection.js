import React from "react";

function BookingSelection({ availablePackages, availableTests, cartItems, toggleItem, testSearch, setTestSearch }) {
  
  // Filter individual tests based on search bar input
  const filteredTests = availableTests.filter(t => 
    t.name?.toLowerCase().includes(testSearch.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-8">
      
      {/* ========================================= */}
      {/* MODULE 1: EXCLUSIVE HEALTH PACKAGES       */}
      {/* ========================================= */}
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
                      <div 
                        key={pkg.id} 
                        onClick={() => toggleItem(pkg)} 
                        className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 relative ${
                          isSelected 
                            ? 'border-purple-600 bg-purple-100 shadow-md scale-[1.02]' 
                            : 'border-purple-200 bg-white hover:border-purple-400 hover:shadow-md'
                        }`}
                      >
                          {/* Special Offer Badge */}
                          {pkg.discountedPrice && (
                            <div className="absolute -top-3 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-md tracking-wide">
                              SPECIAL OFFER
                            </div>
                          )}
                          
                          <h3 className="font-black text-purple-900 text-xl leading-tight">
                            {pkg.name}
                          </h3>
                          
                          {/* Swiggy Style No-Coupon Badge */}
                          {!pkg.allowCoupons && (
                            <span className="inline-block mt-2 text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 uppercase font-bold tracking-wider">
                              No extra coupons
                            </span>
                          )}
                          
                          <p className="text-sm text-gray-600 mt-3 mb-5 line-clamp-3 leading-relaxed">
                            Includes: {pkg.includes}
                          </p>
                          
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
                              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                                isSelected 
                                  ? 'bg-purple-600 border-purple-600 shadow-inner' 
                                  : 'border-gray-300 bg-gray-50'
                              }`}>
                                  {isSelected && <span className="text-white text-sm font-bold">✓</span>}
                              </div>
                          </div>
                      </div>
                  )
              })}
            </div>
        </div>
      )}

      {/* ========================================= */}
      {/* MODULE 2: INDIVIDUAL TESTS LIST           */}
      {/* ========================================= */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-md border border-gray-100 h-fit">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          🧪 Individual Tests
        </h2>
        
        {/* Search Bar */}
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

        {/* Tests List */}
        <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredTests.length === 0 ? (
              <p className="text-center text-gray-500 py-8 italic">No tests found matching your search.</p>
          ) : filteredTests.map(test => {
            const isSelected = cartItems.find(t => t.id === test.id);
            
            return (
              <div 
                key={test.id} 
                onClick={() => toggleItem(test)} 
                className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center group ${
                  isSelected 
                    ? 'border-blue-600 bg-blue-50 shadow-sm' 
                    : 'border-gray-100 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex-1 pr-4">
                  <h3 className={`font-bold text-lg leading-tight ${isSelected ? 'text-blue-800' : 'text-gray-800'}`}>
                    {test.name}
                  </h3>
                  
                  {/* Swiggy Style No-Coupon Badge */}
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
                  
                  <div className={`w-7 h-7 rounded-md border-2 flex items-center justify-center transition-colors ${
                    isSelected 
                      ? 'bg-blue-600 border-blue-600' 
                      : 'border-gray-300 bg-white'
                  }`}>
                    {isSelected && <span className="text-white text-sm font-bold">✓</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}

export default BookingSelection;