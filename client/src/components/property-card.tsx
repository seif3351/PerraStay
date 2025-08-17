import { Link } from "wouter";
import { type Property } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import AmenityBadge from "./amenity-badge";
import { Star, MapPin, Wifi, Snowflake, Laptop } from "lucide-react";

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  return (
    <Link href={`/property/${property.id}`}>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all group cursor-pointer">
        <div className="relative">
          <img
            src={property.images?.[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3"}
            alt={property.title}
            className="w-full h-64 object-cover group-hover:scale-105 transition-transform"
          />
          {property.rating && parseFloat(property.rating) > 4.5 && (
            <Badge className="absolute top-4 left-4 bg-perra-gold-light text-perra-gold">
              Featured
            </Badge>
          )}
          {property.isVerified && (
            <Badge className="absolute top-4 right-4 bg-green-100 text-green-800">
              Verified
            </Badge>
          )}
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              New
            </Badge>
            {property.rating && parseFloat(property.rating) > 0 && (
              <div className="flex items-center">
                <Star className="w-4 h-4 text-perra-gold fill-current" />
                <span className="ml-1 font-medium">{property.rating}</span>
                <span className="ml-1 text-perra-gray">({property.reviewCount})</span>
              </div>
            )}
          </div>

          <h3 className="text-lg font-semibold text-perra-dark mb-2">{property.title}</h3>
          
          <div className="flex items-center text-perra-gray mb-4">
            <MapPin className="w-4 h-4 mr-1" />
            {property.location}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {property.internetSpeed && (
              <AmenityBadge
                icon={<Wifi className="w-3 h-3" />}
                label="High-Speed Internet"
                variant="green"
              />
            )}
            {property.hasAC && (
              <AmenityBadge
                icon={<Snowflake className="w-3 h-3" />}
                label="AC"
                variant="blue"
              />
            )}
            {property.hasWorkspace && (
              <AmenityBadge
                icon={<Laptop className="w-3 h-3" />}
                label="Work Space"
                variant="orange"
              />
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-perra-dark">
                ${parseFloat(property.monthlyPrice).toLocaleString()}
              </span>
              <span className="text-perra-gray">/month</span>
            </div>
            <span className="text-sm text-perra-gray">
              ${parseFloat(property.depositAmount).toLocaleString()} deposit
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
