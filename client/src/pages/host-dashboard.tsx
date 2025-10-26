import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { type Property, type Booking, type User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PropertyCard from "@/components/property-card";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { LoadingSpinner } from "@/components/ui/loading";
import { Plus, Home, Calendar, DollarSign, Users, TrendingUp, Sparkles, CheckCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function HostDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Check authentication only (not host requirement - we'll handle that manually)
  const { isChecking, user: authUser } = useAuthGuard(true, false);

  // Mutation to upgrade user to host
  const upgradeToHostMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/users/upgrade-to-host', {}),
    onSuccess: async (data: any) => {
      // Update local storage with new user data
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      // Close upgrade modal and show success modal
      setShowUpgradeModal(false);
      setShowSuccessModal(true);
      
      // Wait a bit for the cookie to be set, then invalidate auth query
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Invalidate auth query to get updated user data with isHost: true
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      // Also invalidate bookings query to refetch with new host privileges
      await queryClient.invalidateQueries({ queryKey: ['/api/bookings/host'] });
      
      toast({
        title: 'Welcome to hosting!',
        description: 'Your account has been upgraded. You can now list properties.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Upgrade failed',
        description: 'Failed to upgrade your account. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Mutation to update booking status
  const updateBookingStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      // Get fresh CSRF token
      const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
      const { csrfToken } = await csrfResponse.json();
      
      // Make the request with CSRF token
      const response = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update booking status');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate bookings query to refetch updated list
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/host'] });
      
      toast({
        title: 'Booking Updated',
        description: `Booking has been ${variables.status === 'confirmed' ? 'approved' : variables.status}.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update booking status.',
        variant: 'destructive',
      });
    },
  });

  // Fetch host's properties
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties/host"],
    queryFn: async () => {
      const response = await fetch(`/api/properties?hostId=${authUser?.id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        return [];
      }
      return response.json();
    },
    enabled: !isChecking && !!authUser?.id && authUser?.isHost === true,
  });

  const { data: allBookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings/host"],
    queryFn: async () => {
      const response = await fetch(`/api/bookings/host`, {
        credentials: 'include'
      });
      if (!response.ok) {
        // Return empty array if user is not a host yet or error occurs
        return [];
      }
      return response.json();
    },
    enabled: !isChecking && !!authUser?.id && authUser?.isHost === true,
  });

  const totalRevenue = Array.isArray(allBookings) ? allBookings.reduce((sum, booking) => 
    sum + parseFloat(booking.totalAmount), 0
  ) : 0;

  const activeBookings = Array.isArray(allBookings) ? allBookings.filter(booking => 
    booking.status === "active" || booking.status === "confirmed"
  ) : [];

  // Check if user needs to upgrade to host - use useEffect to avoid state update during render
  useEffect(() => {
    if (authUser && !authUser.isHost && !showUpgradeModal && !showSuccessModal) {
      setShowUpgradeModal(true);
    }
  }, [authUser, showUpgradeModal, showSuccessModal]);

  // Show loading state while checking auth - AFTER all hooks
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-perra-dark">Host Dashboard</h1>
          <p className="text-perra-gray mt-2">Manage your properties and bookings</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-96">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                  <Home className="h-4 w-4 text-perra-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{properties.length}</div>
                  <p className="text-xs text-perra-gray">Active listings</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
                  <Calendar className="h-4 w-4 text-perra-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeBookings.length}</div>
                  <p className="text-xs text-perra-gray">Current guests</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-perra-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-perra-gray">All time earnings</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  <TrendingUp className="h-4 w-4 text-perra-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {properties.length > 0 
                      ? (properties.reduce((sum, p) => sum + parseFloat(p.rating || "0"), 0) / properties.length).toFixed(1)
                      : "0.0"
                    }
                  </div>
                  <p className="text-xs text-perra-gray">Across all properties</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {allBookings.length === 0 ? (
                  <p className="text-perra-gray text-center py-8">No recent activity</p>
                ) : (
                  <div className="space-y-4">
                    {allBookings.slice(0, 5).map((booking) => {
                      const property = properties.find(p => p.id === booking.propertyId);
                      return (
                        <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">{property?.title}</p>
                            <p className="text-sm text-perra-gray">
                              Booking {booking.status} • ${booking.totalAmount}
                            </p>
                          </div>
                          <Badge variant={
                            booking.status === "active" ? "default" :
                            booking.status === "confirmed" ? "secondary" :
                            booking.status === "pending" ? "outline" : "destructive"
                          }>
                            {booking.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="properties" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Your Properties</h2>
              <Link href="/add-property">
                <Button className="bg-perra-gold hover:bg-perra-gold/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Property
                </Button>
              </Link>
            </div>

            {properties.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Home className="w-12 h-12 mx-auto text-perra-gray mb-4" />
                  <h3 className="text-lg font-semibold text-perra-dark mb-2">No properties yet</h3>
                  <p className="text-perra-gray mb-4">Start earning by listing your first property</p>
                  <Link href="/add-property">
                    <Button className="bg-perra-gold hover:bg-perra-gold/90">
                      <Plus className="w-4 h-4 mr-2" />
                      List Your Property
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <h2 className="text-xl font-semibold">Bookings Management</h2>
            
            {allBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-perra-gray mb-4" />
                  <h3 className="text-lg font-semibold text-perra-dark mb-2">No bookings yet</h3>
                  <p className="text-perra-gray">Bookings will appear here once guests make reservations</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {allBookings.map((booking) => {
                  const property = properties.find(p => p.id === booking.propertyId);
                  return (
                    <Card key={booking.id}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-lg">{property?.title}</h3>
                            <p className="text-perra-gray mb-2">{property?.location}</p>
                            <div className="space-y-1 text-sm">
                              <p>Check-in: {new Date(booking.checkInDate).toLocaleDateString()}</p>
                              <p>Check-out: {new Date(booking.checkOutDate).toLocaleDateString()}</p>
                              <p>Total: ${booking.totalAmount}</p>
                              <p>Deposit: ${booking.depositAmount}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className="mb-2" variant={
                              booking.status === "active" ? "default" :
                              booking.status === "confirmed" ? "secondary" :
                              booking.status === "pending" ? "outline" : "destructive"
                            }>
                              {booking.status}
                            </Badge>
                            {booking.status === "pending" && (
                              <div className="space-y-2">
                                <Button 
                                  size="sm" 
                                  className="w-full bg-perra-gold hover:bg-perra-gold/90"
                                  onClick={() => updateBookingStatusMutation.mutate({ 
                                    bookingId: booking.id, 
                                    status: 'confirmed' 
                                  })}
                                  disabled={updateBookingStatusMutation.isPending}
                                >
                                  {updateBookingStatusMutation.isPending ? 'Approving...' : 'Approve'}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="w-full"
                                  onClick={() => updateBookingStatusMutation.mutate({ 
                                    bookingId: booking.id, 
                                    status: 'cancelled' 
                                  })}
                                  disabled={updateBookingStatusMutation.isPending}
                                >
                                  {updateBookingStatusMutation.isPending ? 'Declining...' : 'Decline'}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <h2 className="text-xl font-semibold">Analytics & Insights</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Revenue</span>
                      <span className="font-semibold">${totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average per booking</span>
                      <span className="font-semibold">
                        ${allBookings.length > 0 ? (totalRevenue / allBookings.length).toLocaleString() : "0"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total bookings</span>
                      <span className="font-semibold">{allBookings.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Property Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {properties.map((property) => (
                      <div key={property.id} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{property.title}</p>
                          <p className="text-sm text-perra-gray">Rating: {property.rating} ⭐</p>
                        </div>
                        <span className="font-semibold">${property.monthlyPrice}/mo</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Upgrade to Host Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-perra-gold" />
              Become a Host
            </DialogTitle>
            <DialogDescription>
              Start earning by listing your properties on PerraStay
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">List Your Properties</h4>
                  <p className="text-sm text-gray-600">Share your space with travelers from around the world</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Earn Extra Income</h4>
                  <p className="text-sm text-gray-600">Set your own prices and availability</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">Verified & Secure</h4>
                  <p className="text-sm text-gray-600">All bookings are protected with secure deposits</p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowUpgradeModal(false);
                setLocation('/guest-dashboard');
              }}
            >
              Maybe Later
            </Button>
            <Button
              className="bg-perra-gold hover:bg-perra-gold/90"
              onClick={() => upgradeToHostMutation.mutate()}
              disabled={upgradeToHostMutation.isPending}
            >
              {upgradeToHostMutation.isPending ? 'Upgrading...' : 'Become a Host'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success & Tutorial Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              Welcome to Hosting!
            </DialogTitle>
            <DialogDescription>
              You're now a PerraStay host. Here's how to get started:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert>
              <Home className="h-4 w-4" />
              <AlertTitle>Step 1: Add Your First Property</AlertTitle>
              <AlertDescription>
                Click the "Add Property" button to create your first listing with photos, amenities, and pricing.
              </AlertDescription>
            </Alert>
            
            <Alert>
              <Users className="h-4 w-4" />
              <AlertTitle>Step 2: Manage Bookings</AlertTitle>
              <AlertDescription>
                Review and approve booking requests from guests. You'll receive notifications for new requests.
              </AlertDescription>
            </Alert>
            
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertTitle>Step 3: Track Your Earnings</AlertTitle>
              <AlertDescription>
                Monitor your revenue and property performance in the Analytics tab.
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter>
            <Button
              className="w-full bg-perra-gold hover:bg-perra-gold/90"
              onClick={() => {
                setShowSuccessModal(false);
                // Refresh the page to show host dashboard
                window.location.reload();
              }}
            >
              Got it, let's start!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
