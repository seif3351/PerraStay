import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { type Booking, type Property } from "@shared/schema";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface BookingCardProps {
  booking: Booking;
  property: Property;
  variant?: "active" | "upcoming" | "past";
  onCancel?: () => Promise<void>;
}

export function BookingCard({ booking, property, variant = "active", onCancel }: BookingCardProps) {
  const getBadgeStyle = () => {
    switch (variant) {
      case "active":
        return {
          containerClass: "border-l-4 border-l-green-500",
          badgeClass: "bg-green-100 text-green-800",
          label: "Active"
        };
      case "upcoming":
        return {
          containerClass: "border-l-4 border-l-blue-500",
          badgeClass: "bg-blue-100 text-blue-800",
          label: "Confirmed"
        };
      case "past":
        return {
          containerClass: "",
          badgeClass: "bg-gray-100 text-gray-800",
          label: "Completed"
        };
    }
  };

  const style = getBadgeStyle();

  return (
    <Card className={style.containerClass}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{property.title}</h3>
              <Badge className={style.badgeClass}>{style.label}</Badge>
            </div>
            <div className="flex items-center text-perra-gray mb-2">
              <MapPin className="w-4 h-4 mr-1" />
              {property.location}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-perra-gray">Check-in</p>
                <p className="font-medium">{new Date(booking.checkInDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-perra-gray">Check-out</p>
                <p className="font-medium">{new Date(booking.checkOutDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-perra-gray">Total paid</p>
            <p className="font-semibold text-lg">${booking.totalAmount}</p>
            <div className="space-y-2 mt-2">
              <Button 
                size="sm" 
                variant={variant === "past" ? "default" : "outline"}
                className={variant === "past" ? "bg-perra-gold hover:bg-perra-gold/90" : "w-full"}
                onClick={() => window.location.href = `/property/${property.id}`}
              >
                {variant === "past" ? "Leave Review" : "View Details"}
              </Button>
              {variant === "upcoming" && onCancel && (
                <ConfirmDialog
                  title="Cancel Booking"
                  description="Are you sure you want to cancel this booking? This action cannot be undone."
                  triggerText="Cancel"
                  confirmText="Yes, Cancel Booking"
                  variant="destructive"
                  triggerClassName="w-full text-red-600 border-red-200 hover:bg-red-50"
                  onConfirm={onCancel}
                />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}