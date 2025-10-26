import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type Booking, type Property, type DeliveryOrder } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading";
import { Calendar, Package, MapPin, Clock, Star, ShoppingCart } from "lucide-react";

export default function GuestDashboard() {
  const [activeTab, setActiveTab] = useState("bookings");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Check authentication (require auth, no host requirement)
  const { isChecking, user } = useAuthGuard(true, false);

  const { 
    data: bookings = [], 
    isLoading: isLoadingBookings 
  } = useQuery<Booking[]>({
    queryKey: ["/api/bookings/guest"],
    enabled: !isChecking, // Only fetch when auth check is complete
  });

  const { 
    data: deliveryOrders = [],
    isLoading: isLoadingDeliveryOrders
  } = useQuery<DeliveryOrder[]>({
    queryKey: ["/api/delivery-orders/guest"],
    enabled: !isChecking, // Only fetch when auth check is complete
  });

  // Get property details for bookings
  const { 
    data: allProperties = [],
    isLoading: isLoadingProperties
  } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    enabled: !isChecking && bookings.length > 0, // Only fetch when auth check is complete and we have bookings
  });

  // Show loading state while checking auth - AFTER all hooks
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const getPropertyForBooking = (booking: Booking) => {
    return allProperties.find(p => p.id === booking.propertyId);
  };

  const activeBookings = bookings.filter(booking => 
    booking.status === "active" || booking.status === "confirmed"
  );

  const upcomingBookings = bookings.filter(booking => 
    booking.status === "confirmed" && new Date(booking.checkInDate) > new Date()
  );

  const pastBookings = bookings.filter(booking => 
    booking.status === "completed"
  );

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      
      toast({
        title: 'Booking Cancelled',
        description: 'Your booking has been successfully cancelled.',
      });
      
      queryClient.invalidateQueries({
        queryKey: ['/api/bookings/guest']
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel booking. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const renderBookingCard = (booking: Booking, status: 'active' | 'upcoming' | 'past') => {
    const property = getPropertyForBooking(booking);
    if (!property) return null;

    return (
      <Card 
        key={booking.id} 
        className={status === 'active' ? 'border-l-4 border-l-green-500' : 
                  status === 'upcoming' ? 'border-l-4 border-l-blue-500' : 
                  undefined}
      >
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg">{property.title}</h3>
                <Badge 
                  className={
                    status === 'active' ? 'bg-green-100 text-green-800' :
                    status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                    undefined
                  }
                >
                  {status === 'active' ? 'Active' :
                   status === 'upcoming' ? 'Confirmed' :
                   'Completed'}
                </Badge>
              </div>
              <div className="flex items-center text-perra-gray mb-2">
                <MapPin className="w-4 h-4 mr-1" />
                {property.location}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-perra-gray">Check-in</p>
                  <p className="font-medium">
                    {new Date(booking.checkInDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-perra-gray">Check-out</p>
                  <p className="font-medium">
                    {new Date(booking.checkOutDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-perra-gray">Total paid</p>
              <p className="font-semibold text-lg">${booking.totalAmount}</p>
              <div className="space-y-2 mt-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.href = `/property/${property.id}`}
                >
                  View Details
                </Button>
                {status === 'upcoming' && (
                  <ConfirmDialog
                    title="Cancel Booking"
                    description="Are you sure you want to cancel this booking? This action cannot be undone."
                    triggerText="Cancel"
                    confirmText="Yes, Cancel Booking"
                    variant="destructive"
                    triggerClassName="w-full text-red-600 border-red-200 hover:bg-red-50"
                    onConfirm={() => handleCancelBooking(booking.id)}
                  />
                )}
                {status === 'past' && (
                  <Button 
                    size="sm" 
                    className="w-full bg-perra-gold hover:bg-perra-gold/90"
                    onClick={() => window.location.href = `/property/${property.id}#reviews`}
                  >
                    Leave Review
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-perra-dark">Guest Dashboard</h1>
          <p className="text-perra-gray mt-2">Manage your bookings and orders</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 lg:w-96">
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>
            
          <div className="mt-6">
            <TabsContent value="bookings">
              {isLoadingBookings || isLoadingProperties ? (
                <LoadingSpinner />
              ) : (
                <div className="space-y-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Stays</CardTitle>
                        <Calendar className="h-4 w-4 text-perra-gold" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{activeBookings.length}</div>
                        <p className="text-xs text-perra-gray">Currently staying</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
                        <Clock className="h-4 w-4 text-perra-gold" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{upcomingBookings.length}</div>
                        <p className="text-xs text-perra-gray">Future reservations</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Stays</CardTitle>
                        <Star className="h-4 w-4 text-perra-gold" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{bookings.length}</div>
                        <p className="text-xs text-perra-gray">All time bookings</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Active Bookings */}
                  {activeBookings.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold mb-4">Active Stays</h2>
                      <div className="space-y-4">
                        {activeBookings.map(booking => renderBookingCard(booking, 'active'))}
                      </div>
                    </div>
                  )}

                  {/* Upcoming Bookings */}
                  {upcomingBookings.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold mb-4">Upcoming Stays</h2>
                      <div className="space-y-4">
                        {upcomingBookings.map(booking => renderBookingCard(booking, 'upcoming'))}
                      </div>
                    </div>
                  )}

                  {/* Past Bookings */}
                  {pastBookings.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold mb-4">Past Stays</h2>
                      <div className="space-y-4">
                        {pastBookings.map(booking => renderBookingCard(booking, 'past'))}
                      </div>
                    </div>
                  )}

                  {bookings.length === 0 && (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Calendar className="w-12 h-12 mx-auto text-perra-gray mb-4" />
                        <h3 className="text-lg font-semibold text-perra-dark mb-2">
                          No bookings yet
                        </h3>
                        <p className="text-perra-gray mb-4">
                          Start exploring amazing properties for your next extended stay
                        </p>
                        <Button 
                          onClick={() => window.location.href = "/"}
                          className="bg-perra-gold hover:bg-perra-gold/90"
                        >
                          Browse Properties
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="delivery">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Delivery Orders</h2>
                  <Button className="bg-perra-gold hover:bg-perra-gold/90">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    New Order
                  </Button>
                </div>

                {isLoadingDeliveryOrders ? (
                  <LoadingSpinner />
                ) : deliveryOrders.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Package className="w-12 h-12 mx-auto text-perra-gray mb-4" />
                      <h3 className="text-lg font-semibold text-perra-dark mb-2">No orders yet</h3>
                      <p className="text-perra-gray mb-4">Order food and essentials with exclusive discounts</p>
                      <Button className="bg-perra-gold hover:bg-perra-gold/90">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Start Shopping
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {deliveryOrders.map((order) => (
                      <Card key={order.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-lg capitalize">{order.orderType} Order</h3>
                                <Badge variant={
                                  order.status === "delivered" ? "default" :
                                  order.status === "preparing" ? "secondary" :
                                  order.status === "confirmed" ? "outline" : "outline"
                                }>
                                  {order.status}
                                </Badge>
                              </div>
                              <p className="text-perra-gray mb-2">{order.deliveryAddress}</p>
                              <div className="text-sm">
                                <p>{order.items?.length || 0} items</p>
                                <p>Ordered: {new Date(order.createdAt!).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold">${order.totalAmount}</p>
                              {order.discountAmount && parseFloat(order.discountAmount) > 0 && (
                                <p className="text-sm text-green-600">
                                  Saved ${order.discountAmount}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="profile">
              <div className="space-y-6">
                <h2 className="text-xl font-semibold">Profile Settings</h2>
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center py-12">
                      <p className="text-perra-gray">
                        Profile settings will be available in a future update.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}