import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { type Property, type Review } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import AmenityBadge from "@/components/amenity-badge";
import { Calendar, MapPin, Star, Wifi, Zap, Users, Bath, Bed, DollarSign, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [checkInDate, setCheckInDate] = useState("");
  const [duration, setDuration] = useState("1");
  
  // Check authentication status (optional - for booking functionality)
  const { isChecking, user } = useAuthGuard(false, false);

  const { data: property, isLoading } = useQuery<Property>({
    queryKey: ["/api/properties", id],
    enabled: !!id,
  });

  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ["/api/properties", id, "reviews"],
    enabled: !!id,
  });

  const validateBookingDates = (checkIn: string, duration: string) => {
    const checkInDate = new Date(checkIn);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (checkInDate < today) {
      throw new Error("Check-in date cannot be in the past");
    }
    
    const durationNum = parseInt(duration);
    if (durationNum < 1 || durationNum > 365) {
      throw new Error("Duration must be between 1 and 365 days");
    }
    
    return true;
  };

  const bookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      validateBookingDates(bookingData.checkInDate, bookingData.duration);
      return apiRequest("POST", "/api/bookings", bookingData);
    },
    onSuccess: () => {
      toast({
        title: "Booking Successful!",
        description: "Your booking request has been submitted.",
      });
    },
    onError: () => {
      toast({
        title: "Booking Failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const handleBooking = () => {
    if (!property || !checkInDate) return;

    // Check if user is authenticated
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to book a property.",
        variant: "destructive",
      });
      // Redirect to auth page
      window.location.href = '/auth?redirect=/property/' + property.id;
      return;
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkIn);
    checkOut.setMonth(checkOut.getMonth() + parseInt(duration));

    const monthlyPrice = parseFloat(property.monthlyPrice);
    const totalAmount = monthlyPrice * parseInt(duration);

    bookingMutation.mutate({
      guestId: user.id, // Using authenticated user's ID
      propertyId: property.id,
      checkInDate: checkIn.toISOString(),
      checkOutDate: checkOut.toISOString(),
      totalAmount: totalAmount.toString(),
      depositAmount: property.depositAmount,
      status: "pending",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 animate-pulse">
          <div className="h-96 bg-gray-200 rounded-xl mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
            <div className="h-96 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-perra-dark mb-4">Property Not Found</h1>
          <p className="text-perra-gray">The property you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Property Images */}
        <div className="relative rounded-xl overflow-hidden mb-8">
          <img
            src={property.images?.[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3"}
            alt={property.title}
            className="w-full h-96 object-cover"
          />
          {property.isVerified && (
            <Badge className="absolute top-4 left-4 bg-green-600 text-white">
              <Shield className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Property Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-perra-gold-light text-perra-gold">Featured</Badge>
                {property.rating && parseFloat(property.rating) > 0 && (
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-perra-gold fill-current" />
                    <span className="ml-1 font-medium">{property.rating}</span>
                    <span className="ml-1 text-perra-gray">({property.reviewCount})</span>
                  </div>
                )}
              </div>
              
              <h1 className="text-3xl font-heading font-bold text-perra-dark mb-2">
                {property.title}
              </h1>
              
              <div className="flex items-center text-perra-gray mb-4">
                <MapPin className="w-4 h-4 mr-1" />
                {property.location}
              </div>

              <div className="flex items-center gap-6 text-sm text-perra-gray">
                <div className="flex items-center">
                  <Bed className="w-4 h-4 mr-1" />
                  {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center">
                  <Bath className="w-4 h-4 mr-1" />
                  {property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="text-xl font-semibold text-perra-dark mb-4">Description</h2>
              <p className="text-perra-gray leading-relaxed">{property.description}</p>
            </div>

            <Separator />

            <div>
              <h2 className="text-xl font-semibold text-perra-dark mb-4">Amenities & Features</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {property.internetSpeed && (
                  <AmenityBadge 
                    icon={<Wifi className="w-4 h-4" />}
                    label={`${property.internetSpeed} Mbps Internet`}
                    verified
                  />
                )}
                {property.hasStableElectricity && (
                  <AmenityBadge 
                    icon={<Zap className="w-4 h-4" />}
                    label="Stable Electricity"
                    verified
                  />
                )}
                {property.amenities?.map((amenity, index) => (
                  <AmenityBadge key={index} label={amenity} />
                ))}
              </div>
            </div>

            <Separator />

            {/* Reviews Section */}
            {reviews.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-perra-dark mb-4">
                  Reviews ({reviews.length})
                </h2>
                <div className="space-y-4">
                  {reviews.slice(0, 3).map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center mb-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? "text-perra-gold fill-current"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="ml-2 text-sm text-perra-gray">
                            {new Date(review.createdAt!).toLocaleDateString()}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-perra-gray">{review.comment}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardContent className="p-6">
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-perra-dark">
                      ${property.monthlyPrice}
                    </span>
                    <span className="text-perra-gray ml-1">/month</span>
                  </div>
                  <p className="text-sm text-perra-gray mt-1">
                    ${property.depositAmount} security deposit
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-perra-dark mb-1">
                      Check-in Date
                    </label>
                    <input
                      type="date"
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-perra-gold focus:border-transparent"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-perra-dark mb-1">
                      Duration
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-perra-gold focus:border-transparent"
                    >
                      <option value="1">1 month</option>
                      <option value="2">2 months</option>
                      <option value="3">3 months</option>
                      <option value="6">6 months</option>
                      <option value="12">12 months</option>
                    </select>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Monthly rate × {duration}</span>
                      <span>${(parseFloat(property.monthlyPrice) * parseInt(duration)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Security deposit</span>
                      <span>${parseFloat(property.depositAmount).toLocaleString()}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>${(parseFloat(property.monthlyPrice) * parseInt(duration) + parseFloat(property.depositAmount)).toLocaleString()}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleBooking}
                    disabled={!checkInDate || bookingMutation.isPending}
                    className="w-full bg-perra-gold hover:bg-perra-gold/90"
                  >
                    {bookingMutation.isPending ? "Booking..." : "Reserve Now"}
                  </Button>

                  <div className="text-xs text-perra-gray text-center">
                    <p>You won't be charged yet. Final booking requires host approval.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
