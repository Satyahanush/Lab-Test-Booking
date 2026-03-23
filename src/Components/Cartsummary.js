import React from "react";

function CartSummary({ 
  cartItems, 
  subtotal, 
  appliedCoupon, 
  discountAmount, 
  collectionType, 
  currentDeliveryCharge, 
  finalTotal, 
  deliveryEnabled // This is the new setting coming from your Admin portal
}) {
  return (
    <div className="mt-8 bg-gray-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
      
      {/* Decorative glowing background effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
      
      {/* Header Title */}
      <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest mb-4 border-b border-gray-700 pb-3 relative z-10">
        Bill Summary
      </h3>
      
      {/* Scrollable list of items in the cart */}
      <div className="space-y-4 mb-5 max-h-48 overflow-y-auto pr-2 custom-scrollbar relative z-10">
        {cartItems.length === 0 ? (
            <p className="italic opacity-50 text-sm text-center py-2">
              Your cart is empty.
            </p>
        ) : (
            cartItems.map((item) => (
              <div key={item.id} className="pb-1">
                <div className="flex justify-between text-sm items-start">
                  <span className="font-medium pr-3 leading-tight">
                    {item.name}
                  </span>
                  <span className="font-mono font-bold">
                    ₹{item.discountedPrice || item.price}
                  </span>
                </div>
                
                {/* Swiggy-style strict coupon restriction message */}
                {item.allowCoupons === false && appliedCoupon && (
                    <p className="text-[10px] text-orange-400 italic mt-1 font-medium">
                      * Coupon not applicable on this item
                    </p>
                )}
              </div>
            ))
        )}
      </div>
      
      {/* Math & Totals Section */}
      <div className="pt-4 space-y-3 border-t border-gray-700 relative z-10">
        
        {/* Subtotal */}
        <div className="flex justify-between items-center text-sm text-gray-300">
          <span>Item Total</span>
          <span className="font-mono">₹{subtotal}</span>
        </div>
        
        {/* Discount Row (Only shows if a coupon is successfully applied) */}
        {appliedCoupon && discountAmount > 0 && (
          <div className="flex justify-between items-center text-sm text-green-400 font-bold bg-green-900/30 p-2 rounded -mx-2 px-2">
            <span>Coupon Discount ({appliedCoupon.code})</span>
            <span className="font-mono">- ₹{discountAmount}</span>
          </div>
        )}

        {/* Dynamic Delivery Row (Only shows if Home Collection is selected) */}
        {collectionType === "home" && (
          <div 
            className={`flex justify-between items-center text-sm font-bold p-2 rounded -mx-2 px-2 transition-colors ${
              deliveryEnabled && currentDeliveryCharge > 0 
                ? 'text-yellow-400 bg-yellow-900/20' // Paid Delivery Styling
                : 'text-green-400 bg-green-900/20'   // Free Delivery Styling
            }`}
          >
            <span>Home Delivery Fee</span>
            
            {/* Logic to determine if we show a price or the "Free" badge */}
            {deliveryEnabled && currentDeliveryCharge > 0 ? (
                <span className="font-mono">+ ₹{currentDeliveryCharge}</span>
            ) : (
                <span className="uppercase tracking-widest text-xs border border-green-500 px-2 py-0.5 rounded bg-green-800 text-white shadow-sm">
                  Free
                </span>
            )}
          </div>
        )}
        
        {/* Final Total Row */}
        <div className="flex justify-between items-center pt-4 mt-2 border-t border-gray-700">
          <span className="text-xl font-bold text-white uppercase tracking-wider">
            To Pay
          </span>
          <span className="text-3xl font-black text-white">
            ₹{finalTotal}
          </span>
        </div>

      </div>
    </div>
  );
}

export default CartSummary;