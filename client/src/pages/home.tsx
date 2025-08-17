import { useQuery } from "@tanstack/react-query";
import { type Property } from "@shared/schema";
import SearchForm from "@/components/search-form";
import PropertyCard from "@/components/property-card";
import DeliverySection from "@/components/delivery-section";
import AmenityBadge from "@/components/amenity-badge";
import { Wifi, Zap, Coffee, Laptop, Shield, Clock, ShoppingBasket, Utensils } from "lucide-react";

export default function Home() {
  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const featuredProperties = properties.slice(0, 3);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-perra-gold-light via-white to-perra-light py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-heading font-bold text-perra-dark mb-4">
              Your Home Away From Home
            </h1>
            <p className="text-xl text-perra-gray max-w-3xl mx-auto">
              Discover comfortable medium-term rentals with premium amenities, reliable internet, and integrated services. Minimum 1-month stays for the perfect extended getaway.
            </p>
          </div>
          <SearchForm />
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-perra-dark">Featured Listings</h2>
            <a href="/search" className="text-perra-gold hover:underline font-medium">View all →</a>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
                  <div className="w-full h-64 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Delivery Section */}
      <DeliverySection />

      {/* Amenities Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-perra-dark mb-4">
              Premium Amenities Guaranteed
            </h2>
            <p className="text-lg text-perra-gray max-w-3xl mx-auto">
              Every Perra listing is verified for essential amenities. We ensure you have everything needed for comfortable medium-term living.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 bg-white rounded-xl shadow-lg">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Wifi className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-perra-dark mb-2">High-Speed Internet</h3>
              <p className="text-perra-gray text-sm mb-3">Minimum 50 Mbps download speed guaranteed</p>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">Verified</span>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-lg">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-perra-dark mb-2">Stable Electricity</h3>
              <p className="text-perra-gray text-sm mb-3">Reliable power with backup generators available</p>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">Verified</span>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-lg">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Coffee className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-perra-dark mb-2">Full Kitchen</h3>
              <p className="text-perra-gray text-sm mb-3">Complete cooking facilities and utensils included</p>
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">Included</span>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-lg">
              <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Laptop className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="font-semibold text-perra-dark mb-2">Work Space</h3>
              <p className="text-perra-gray text-sm mb-3">Dedicated work area with ergonomic setup</p>
              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-medium">Available</span>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Deposit Section */}
      <section className="bg-perra-dark py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading font-bold text-white mb-4">
              Secure & Transparent Deposits
            </h2>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">
              Our secure deposit system protects both guests and hosts. All deposits are held in escrow and returned promptly after checkout inspection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-perra-gold rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Secure Payment</h3>
              <p className="text-gray-300">Deposit is securely held in escrow during your stay</p>
            </div>

            <div className="text-center">
              <div className="bg-perra-gold rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Property Inspection</h3>
              <p className="text-gray-300">Professional checkout inspection within 48 hours</p>
            </div>

            <div className="text-center">
              <div className="bg-perra-gold rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Quick Refund</h3>
              <p className="text-gray-300">Full deposit returned within 5-7 business days</p>
            </div>
          </div>

          <div className="mt-12 bg-gray-800 rounded-xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-semibold text-white mb-4">Typical Deposit Amounts</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Studio/1BR</span>
                    <span className="text-perra-gold font-semibold">$500 - $800</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">2BR</span>
                    <span className="text-perra-gold font-semibold">$800 - $1,200</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">3BR+</span>
                    <span className="text-perra-gold font-semibold">$1,200 - $2,000</span>
                  </div>
                </div>
              </div>
              <div className="text-center md:text-right">
                <div className="bg-perra-gold rounded-lg p-6">
                  <Shield className="w-12 h-12 text-white mx-auto mb-3" />
                  <h4 className="text-white font-semibold">100% Protected</h4>
                  <p className="text-white text-sm opacity-90">Your deposit is fully insured</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
