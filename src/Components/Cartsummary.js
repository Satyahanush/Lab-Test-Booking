import React from "react";

function CartSummary({ 
  cartItems, 
  subtotal, 
  appliedCoupon, 
  discountAmount, 
  collectionType, 
  currentDeliveryCharge, 
  finalTotal 
}) {
  return (
    <div className="mt-8 bg-gray-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
      
      {/* Background visual effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
      
      <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest mb-4 border-b border-gray-700 pb-3 relative z-10">
        Bill Summary
      </h3>
      
      {/* List of Cart Items */}
      <div className="space-y-4 mb-5 max-h-48 overflow-y-auto pr-2 custom-scrollbar relative z-10">
        {cartItems.length === 0 ? (
            <p className="italic opacity-50 text-sm text-center py-2">Your cart is empty.</p>
        ) : cartItems.map(item => (
          <div key={item.id} className="pb-1">
            <div className="flex justify-between text-sm items-start">
              <span className="font-medium pr-3 leading-tight">{item.name}</span>
              <span className="font-mono font-bold">₹{item.discountedPrice || item.price}</span>
            </div>
            
            {/* Warning if the item is restricting the coupon */}
            {item.allowCoupons === false && appliedCoupon && (
                <p className="text-[10px] text-orange-400 italic mt-1 font-medium">
                  * Coupon not applicable on this item
                </p>
            )}
          </div>
        ))}
      </div>
      
      {/* Financial Math Breakdown */}
      <div className="pt-4 space-y-3 border-t border-gray-700 relative z-10">
        
        <div className="flex justify-between items-center text-sm text-gray-300">
          <span>Item Total</span>
          <span className="font-mono">₹{subtotal}</span>
        </div>
        
        {/* Dynamic Coupon Display */}
        {appliedCoupon && discountAmount > 0 && (
          <div className="flex justify-between items-center text-sm text-green-400 font-bold bg-green-900/30 p-2 rounded -mx-2 px-2">
            <span>Coupon Discount ({appliedCoupon.code})</span>
            <span className="font-mono">- ₹{discountAmount}</span>
          </div>
        )}

        {/* Dynamic Delivery Display */}
        {collectionType === "home" && (
          <div className="flex justify-between items-center text-sm text-yellow-400 font-bold bg-yellow-900/20 p-2 rounded -mx-2 px-2">
            <span>Home Delivery Fee</span>
            <span className="font-mono">+ ₹{currentDeliveryCharge}</span>
          </div>
        )}
        
        {/* Final Total */}
        <div className="flex justify-between items-center pt-4 mt-2 border-t border-gray-700">
          <span className="text-xl font-bold text-white uppercase tracking-wider">To Pay</span>
          <span className="text-3xl font-black text-white">₹{finalTotal}</span>
        </div>
      </div>
    </div>
  );
}

export default CartSummary;