import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { LoadingSpinner } from "@/components/ui/loading";
import { ArrowLeft, Calendar, DollarSign, Home, UserCircle, MapPin, Wifi, Key, Phone, Clock, Gift, ExternalLink, Camera, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookingPhotoUpload } from "@/components/booking-photo-upload";
import { BookingPhotoGallery } from "@/components/booking-photo-gallery";
import type { Booking, Property, User, PropertyAccessInfo } from "@shared/schema";

interface BookingWithDetails extends Booking {
  property: Property;
  guest: User;
  host: User;
  accessInfo?: PropertyAccessInfo;
}

export default function BookingDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { isChecking, user } = useAuthGuard(true, false);

  const { data: booking, isLoading, error } = useQuery<BookingWithDetails>({
    queryKey: [`/api/bookings/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/bookings/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch booking details');
      }
      return response.json();
    },
    enabled: !isChecking && !!id && !!user,
  });

  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">
              {error ? 'Failed to load booking details' : 'Booking not found'}
            </p>
            <Button
              onClick={() => setLocation(user?.isHost ? '/host-dashboard' : '/guest-dashboard')}
              className="w-full mt-4"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isGuest = user?.id === booking.guestId;
  const checkInDate = new Date(booking.checkInDate);
  const checkOutDate = new Date(booking.checkOutDate);
  const now = new Date();
  const isBeforeCheckIn = now < checkInDate;
  const isAfterCheckOut = now > checkOutDate;
  const isActivePeriod = now >= checkInDate && now <= checkOutDate;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation(isGuest ? '/guest-dashboard' : '/host-dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-heading font-bold text-perra-dark">
                Booking Details
              </h1>
              <p className="text-perra-gray mt-1">Booking ID: {booking.id}</p>
            </div>
            <Badge className={getStatusColor(booking.status || 'pending')}>
              {booking.status?.toUpperCase() || 'PENDING'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Property Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {booking.property.images && booking.property.images.length > 0 && (
                    <img
                      src={booking.property.images[0]}
                      alt={booking.property.title}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <h3 className="text-xl font-semibold text-perra-dark">
                      {booking.property.title}
                    </h3>
                    <p className="text-perra-gray flex items-center gap-1 mt-1">
                      <MapPin className="h-4 w-4" />
                      {booking.property.location}
                    </p>
                  </div>
                  <p className="text-gray-600">{booking.property.description}</p>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-perra-gray">Bedrooms</p>
                      <p className="font-semibold">{booking.property.bedrooms}</p>
                    </div>
                    <div>
                      <p className="text-sm text-perra-gray">Bathrooms</p>
                      <p className="font-semibold">{booking.property.bathrooms}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Booking Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-32 text-sm text-perra-gray">Check-in</div>
                    <div className="flex-1">
                      <p className="font-semibold">{checkInDate.toLocaleDateString('en-US', { 
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                      })}</p>
                      {isBeforeCheckIn && (
                        <p className="text-sm text-perra-gray mt-1">
                          In {Math.ceil((checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-32 text-sm text-perra-gray">Check-out</div>
                    <div className="flex-1">
                      <p className="font-semibold">{checkOutDate.toLocaleDateString('en-US', { 
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                      })}</p>
                      {isActivePeriod && (
                        <p className="text-sm text-perra-gray mt-1">
                          In {Math.ceil((checkOutDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-4 pt-4 border-t">
                    <div className="w-32 text-sm text-perra-gray">Duration</div>
                    <div className="flex-1">
                      <p className="font-semibold">
                        {Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))} days
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5" />
                  {isGuest ? 'Host Information' : 'Guest Information'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold">
                    {isGuest 
                      ? `${booking.host.firstName} ${booking.host.lastName}`
                      : `${booking.guest.firstName} ${booking.guest.lastName}`
                    }
                  </p>
                  <p className="text-sm text-perra-gray">
                    {isGuest ? booking.host.email : booking.guest.email}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Property Access Information - Only for confirmed bookings and guests */}
            {isGuest && booking.accessInfo && (booking.status === 'confirmed' || booking.status === 'active' || booking.status === 'completed') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Property Access Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {/* Access Codes */}
                    {(booking.accessInfo.doorCode || booking.accessInfo.gateCode) && (
                      <AccordionItem value="codes">
                        <AccordionTrigger className="text-base font-semibold">
                          <span className="flex items-center gap-2">
                            <Key className="h-4 w-4" />
                            Access Codes
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3">
                          {booking.accessInfo.doorCode && (
                            <div>
                              <p className="text-sm text-perra-gray">Door Code</p>
                              <p className="font-mono font-semibold text-lg">{booking.accessInfo.doorCode}</p>
                            </div>
                          )}
                          {booking.accessInfo.gateCode && (
                            <div>
                              <p className="text-sm text-perra-gray">Gate Code</p>
                              <p className="font-mono font-semibold text-lg">{booking.accessInfo.gateCode}</p>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* WiFi Information */}
                    {(booking.accessInfo.wifiName || booking.accessInfo.wifiPassword) && (
                      <AccordionItem value="wifi">
                        <AccordionTrigger className="text-base font-semibold">
                          <span className="flex items-center gap-2">
                            <Wifi className="h-4 w-4" />
                            WiFi Information
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3">
                          {booking.accessInfo.wifiName && (
                            <div>
                              <p className="text-sm text-perra-gray">Network Name</p>
                              <p className="font-semibold">{booking.accessInfo.wifiName}</p>
                            </div>
                          )}
                          {booking.accessInfo.wifiPassword && (
                            <div>
                              <p className="text-sm text-perra-gray">Password</p>
                              <p className="font-mono font-semibold">{booking.accessInfo.wifiPassword}</p>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Key Pickup & Emergency */}
                    {(booking.accessInfo.keyPickupLocation || booking.accessInfo.emergencyContact) && (
                      <AccordionItem value="emergency">
                        <AccordionTrigger className="text-base font-semibold">
                          <span className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Key Pickup & Emergency Contact
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3">
                          {booking.accessInfo.keyPickupLocation && (
                            <div>
                              <p className="text-sm text-perra-gray">Key Pickup Location</p>
                              <p className="text-gray-700 whitespace-pre-wrap">{booking.accessInfo.keyPickupLocation}</p>
                            </div>
                          )}
                          {booking.accessInfo.emergencyContact && (
                            <div>
                              <p className="text-sm text-perra-gray">Emergency Contact</p>
                              <p className="font-semibold">{booking.accessInfo.emergencyContact}</p>
                              {booking.accessInfo.emergencyContactPhone && (
                                <p className="text-gray-700">{booking.accessInfo.emergencyContactPhone}</p>
                              )}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Check-in Instructions & House Rules */}
                    {(booking.accessInfo.checkInInstructions || booking.accessInfo.houseRules) && (
                      <AccordionItem value="instructions">
                        <AccordionTrigger className="text-base font-semibold">
                          <span className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Check-in Instructions & House Rules
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          {booking.accessInfo.checkInInstructions && (
                            <div>
                              <p className="text-sm text-perra-gray font-semibold mb-2">Check-in Instructions</p>
                              <p className="text-gray-700 whitespace-pre-wrap">{booking.accessInfo.checkInInstructions}</p>
                            </div>
                          )}
                          {booking.accessInfo.houseRules && (
                            <div>
                              <p className="text-sm text-perra-gray font-semibold mb-2">House Rules</p>
                              <p className="text-gray-700 whitespace-pre-wrap">{booking.accessInfo.houseRules}</p>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Nearby Places */}
                    {booking.accessInfo.googleMapsLinks && booking.accessInfo.googleMapsLinks.length > 0 && (
                      <AccordionItem value="maps">
                        <AccordionTrigger className="text-base font-semibold">
                          <span className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Nearby Places
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            {booking.accessInfo.googleMapsLinks.map((link, index) => (
                              <a
                                key={index}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 bg-gray-50 hover:bg-gray-100 rounded transition-colors"
                              >
                                <MapPin className="h-4 w-4 text-perra-red" />
                                <span className="flex-1 text-sm truncate">{link}</span>
                                <ExternalLink className="h-4 w-4 text-perra-gray" />
                              </a>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Welcome Box */}
                    {booking.accessInfo.welcomeBoxUrl && (
                      <AccordionItem value="welcome">
                        <AccordionTrigger className="text-base font-semibold">
                          <span className="flex items-center gap-2">
                            <Gift className="h-4 w-4" />
                            Welcome Box
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3">
                          {booking.accessInfo.welcomeBoxDescription && (
                            <p className="text-gray-700">{booking.accessInfo.welcomeBoxDescription}</p>
                          )}
                          <a
                            href={booking.accessInfo.welcomeBoxUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-perra-red hover:underline"
                          >
                            Open Welcome Box
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                </CardContent>
              </Card>
            )}

            {/* Check-in Photos - For guests to upload on check-in date */}
            {isGuest && (booking.status === 'confirmed' || booking.status === 'active' || booking.status === 'completed') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Check-in Photos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const checkIn = new Date(booking.checkInDate);
                    checkIn.setHours(0, 0, 0, 0);
                    const daysDiff = Math.floor((checkIn.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const canUploadCheckIn = daysDiff === 0; // Can upload on check-in day

                    if (!canUploadCheckIn && daysDiff > 0) {
                      return (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            You can upload check-in photos on your check-in date ({new Date(booking.checkInDate).toLocaleDateString()})
                          </AlertDescription>
                        </Alert>
                      );
                    } else if (!canUploadCheckIn && daysDiff < 0) {
                      return (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Check-in photo upload period has passed
                          </AlertDescription>
                        </Alert>
                      );
                    }

                    return <BookingPhotoUpload bookingId={booking.id} photoType="check_in" />;
                  })()}
                  
                  {/* Show uploaded check-in photos */}
                  <div>
                    <h4 className="font-semibold mb-3">Uploaded Photos</h4>
                    <BookingPhotoGallery 
                      bookingId={booking.id} 
                      photoType="check_in"
                      canDelete={true}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Check-out Photos - For guests to upload on check-out date */}
            {isGuest && (booking.status === 'confirmed' || booking.status === 'active' || booking.status === 'completed') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Check-out Photos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const checkOut = new Date(booking.checkOutDate);
                    checkOut.setHours(0, 0, 0, 0);
                    const daysDiff = Math.floor((checkOut.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const canUploadCheckOut = daysDiff === 0; // Can upload on check-out day

                    if (!canUploadCheckOut && daysDiff > 0) {
                      return (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            You can upload check-out photos on your check-out date ({new Date(booking.checkOutDate).toLocaleDateString()})
                          </AlertDescription>
                        </Alert>
                      );
                    } else if (!canUploadCheckOut && daysDiff < 0) {
                      return (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Check-out photo upload period has passed
                          </AlertDescription>
                        </Alert>
                      );
                    }

                    return <BookingPhotoUpload bookingId={booking.id} photoType="check_out" />;
                  })()}
                  
                  {/* Show uploaded check-out photos */}
                  <div>
                    <h4 className="font-semibold mb-3">Uploaded Photos</h4>
                    <BookingPhotoGallery 
                      bookingId={booking.id} 
                      photoType="check_out"
                      canDelete={true}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* For hosts - View all photos */}
            {!isGuest && (booking.status === 'confirmed' || booking.status === 'active' || booking.status === 'completed') && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Guest Check-in Photos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BookingPhotoGallery 
                      bookingId={booking.id} 
                      photoType="check_in"
                      canDelete={false}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Guest Check-out Photos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BookingPhotoGallery 
                      bookingId={booking.id} 
                      photoType="check_out"
                      canDelete={false}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-perra-gray">Total Amount</span>
                    <span className="font-semibold">${booking.totalAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-perra-gray">Deposit</span>
                    <span className="font-semibold">${booking.depositAmount}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t">
                    <span className="text-perra-gray">Deposit Status</span>
                    <Badge variant={booking.depositRefunded ? "default" : "outline"}>
                      {booking.depositRefunded ? "Refunded" : "Held"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setLocation(`/property/${booking.propertyId}`)}
                >
                  View Property
                </Button>
                {booking.status === 'confirmed' && isGuest && (
                  <p className="text-sm text-center text-perra-gray pt-2">
                    More features coming soon: messaging, check-in photos, and more!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
