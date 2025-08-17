import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { type Property } from "@shared/schema";
import PropertyCard from "@/components/property-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search as SearchIcon, Filter, MapPin } from "lucide-react";

export default function Search() {
  const [location, setLocation] = useLocation();
  const [searchParams, setSearchParams] = useState({
    location: "",
    minPrice: "",
    maxPrice: "",
    amenities: [] as string[],
  });

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties", searchParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchParams.location) params.append("location", searchParams.location);
      if (searchParams.minPrice) params.append("minPrice", searchParams.minPrice);
      if (searchParams.maxPrice) params.append("maxPrice", searchParams.maxPrice);
      if (searchParams.amenities.length > 0) params.append("amenities", searchParams.amenities.join(","));
      
      const response = await fetch(`/api/properties?${params.toString()}`);
      return response.json();
    },
  });

  const availableAmenities = [
    "High-Speed Internet",
    "Ultra-Fast Internet", 
    "Fiber Internet",
    "AC",
    "Work Space",
    "Coffee Machine",
    "Full Kitchen",
    "City View",
    "Monitor Included",
    "Backup Power"
  ];

  const handleSearch = () => {
    // Trigger a refetch with current search params
    setSearchParams({ ...searchParams });
  };

  const handleAmenityChange = (amenity: string, checked: boolean) => {
    setSearchParams(prev => ({
      ...prev,
      amenities: checked 
        ? [...prev.amenities, amenity]
        : prev.amenities.filter(a => a !== amenity)
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Where to?"
                value={searchParams.location}
                onChange={(e) => setSearchParams(prev => ({ ...prev, location: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            <Input
              placeholder="Min price"
              type="number"
              value={searchParams.minPrice}
              onChange={(e) => setSearchParams(prev => ({ ...prev, minPrice: e.target.value }))}
            />
            
            <Input
              placeholder="Max price"
              type="number"
              value={searchParams.maxPrice}
              onChange={(e) => setSearchParams(prev => ({ ...prev, maxPrice: e.target.value }))}
            />
            
            <Button onClick={handleSearch} className="bg-perra-gold hover:bg-perra-gold/90">
              <SearchIcon className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-semibold text-perra-dark mb-4 flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-perra-dark mb-3">Amenities</h4>
                  <div className="space-y-2">
                    {availableAmenities.map((amenity) => (
                      <div key={amenity} className="flex items-center space-x-2">
                        <Checkbox
                          id={amenity}
                          checked={searchParams.amenities.includes(amenity)}
                          onCheckedChange={(checked) => 
                            handleAmenityChange(amenity, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={amenity}
                          className="text-sm text-perra-gray cursor-pointer"
                        >
                          {amenity}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:w-3/4">
            <div className="mb-6">
              <h2 className="text-2xl font-heading font-bold text-perra-dark">
                {properties.length} properties found
              </h2>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
                    <div className="w-full h-48 bg-gray-200 rounded-lg mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                  </div>
                ))}
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏠</div>
                <h3 className="text-xl font-semibold text-perra-dark mb-2">No properties found</h3>
                <p className="text-perra-gray">Try adjusting your search criteria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {properties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
