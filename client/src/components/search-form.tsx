import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin } from "lucide-react";

export default function SearchForm() {
  const [, setLocation] = useLocation();
  const [searchData, setSearchData] = useState({
    location: "",
    checkIn: "",
    duration: "1"
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchData.location) params.append("location", searchData.location);
    if (searchData.checkIn) params.append("checkIn", searchData.checkIn);
    if (searchData.duration) params.append("duration", searchData.duration);
    
    setLocation(`/search?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <label className="block text-sm font-medium text-perra-gray mb-1">Where</label>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search destinations"
              value={searchData.location}
              onChange={(e) => setSearchData(prev => ({ ...prev, location: e.target.value }))}
              className="pl-10 focus:ring-perra-gold focus:border-perra-gold"
            />
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-perra-gray" />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-perra-gray mb-1">Check-in</label>
          <Input
            type="date"
            value={searchData.checkIn}
            onChange={(e) => setSearchData(prev => ({ ...prev, checkIn: e.target.value }))}
            className="focus:ring-perra-gold focus:border-perra-gold"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-perra-gray mb-1">Duration</label>
          <Select value={searchData.duration} onValueChange={(value) => setSearchData(prev => ({ ...prev, duration: value }))}>
            <SelectTrigger className="focus:ring-perra-gold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 month</SelectItem>
              <SelectItem value="2">2 months</SelectItem>
              <SelectItem value="3">3 months</SelectItem>
              <SelectItem value="6">6+ months</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          onClick={handleSearch}
          className="bg-perra-gold text-white hover:bg-perra-gold/90 font-semibold flex items-center justify-center mt-6"
        >
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>
    </div>
  );
}
