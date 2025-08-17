import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { type Property, type Booking } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PropertyCard from "@/components/property-card";
import { Plus, Home, Calendar, DollarSign, Users, TrendingUp } from "lucide-react";

export default function HostDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const hostId = "host1"; // In a real app, this would come from auth

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties", { hostId }],
    queryFn: async () => {
      const response = await fetch(`/api/properties?hostId=${hostId}`);
      return response.json();
    },
  });

  const { data: allBookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings", { hostId }],
    queryFn: async () => {
      // In a real implementation, we'd have a specific endpoint for host bookings
      const response = await fetch("/api/bookings");
      const bookings = await response.json();
      return bookings.filter((booking: Booking) =>
        properties.some(property => property.id === booking.propertyId)
      );
    },
    enabled: properties.length > 0,
  });

  const totalRevenue = allBookings.reduce((sum, booking) => 
    sum + parseFloat(booking.totalAmount), 0
  );

  const activeBookings = allBookings.filter(booking => 
    booking.status === "active" || booking.status === "confirmed"
  );

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
              <Button className="bg-perra-gold hover:bg-perra-gold/90">
                <Plus className="w-4 h-4 mr-2" />
                Add New Property
              </Button>
            </div>

            {properties.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Home className="w-12 h-12 mx-auto text-perra-gray mb-4" />
                  <h3 className="text-lg font-semibold text-perra-dark mb-2">No properties yet</h3>
                  <p className="text-perra-gray mb-4">Start earning by listing your first property</p>
                  <Button className="bg-perra-gold hover:bg-perra-gold/90">
                    <Plus className="w-4 h-4 mr-2" />
                    List Your Property
                  </Button>
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
                                <Button size="sm" className="w-full bg-perra-gold hover:bg-perra-gold/90">
                                  Approve
                                </Button>
                                <Button size="sm" variant="outline" className="w-full">
                                  Decline
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
    </div>
  );
}
