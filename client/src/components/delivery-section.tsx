import { Button } from "@/components/ui/button";
import { Utensils, ShoppingBasket, Clock, CheckCircle } from "lucide-react";

import { useAuthGuard } from "@/hooks/use-auth-guard";
import { LoadingSpinner } from "@/components/ui/loading";

export default function DeliverySection() {
  // Check authentication status (optional - just for showing personalized content)
  const { isChecking, user } = useAuthGuard(false, false);

  if (isChecking) {
    return (
      <section className="bg-gradient-to-r from-perra-gold-light to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </section>
    );
  }

  return (
    <section className="bg-gradient-to-r from-perra-gold-light to-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-heading font-bold text-perra-dark mb-6">
              Everything You Need, Delivered
            </h2>
            <p className="text-lg text-perra-gray mb-8">
              Get discounted food and household items delivered to your rental. We partner with local vendors to offer exclusive pricing for Perra guests.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="bg-perra-gold rounded-full p-3">
                  <Utensils className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-perra-dark">Food Delivery</h3>
                  <p className="text-perra-gray">15-30% off local restaurants</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="bg-perra-gold rounded-full p-3">
                  <ShoppingBasket className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-perra-dark">Groceries & Essentials</h3>
                  <p className="text-perra-gray">Household items at wholesale prices</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="bg-perra-gold rounded-full p-3">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-perra-dark">Same-Day Delivery</h3>
                  <p className="text-perra-gray">Quick delivery to your rental location</p>
                </div>
              </div>
            </div>
            
            <Button className="mt-8 bg-perra-gold text-white px-8 py-3 hover:bg-perra-gold/90">
              Browse Delivery Options
            </Button>
          </div>
          
          <div className="relative">
            <img 
              src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600" 
              alt="Food delivery service with fresh groceries" 
              className="rounded-2xl shadow-2xl"
            />
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl p-4 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 rounded-full p-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-perra-dark">Order Delivered</p>
                  <p className="text-sm text-perra-gray">30% savings applied</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
