import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Loader2 } from "lucide-react";

interface CancelBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  checkInDate: string | Date;
  totalAmount: string;
  depositAmount: string;
  onSuccess?: () => void;
}

const CANCELLATION_REASONS = [
  { value: "change_of_plans", label: "Change of plans" },
  { value: "found_alternative", label: "Found alternative accommodation" },
  { value: "emergency", label: "Emergency situation" },
  { value: "price_concerns", label: "Price concerns" },
  { value: "property_concerns", label: "Concerns about the property" },
  { value: "other", label: "Other" },
];

export function CancelBookingDialog({
  open,
  onOpenChange,
  bookingId,
  checkInDate,
  totalAmount,
  depositAmount,
  onSuccess,
}: CancelBookingDialogProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calculate refund preview
  const calculateRefund = () => {
    const now = new Date();
    const checkIn = new Date(checkInDate);
    const daysUntilCheckIn = Math.floor((checkIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const total = parseFloat(totalAmount) + parseFloat(depositAmount);
    
    if (daysUntilCheckIn >= 30) {
      return { percentage: 100, amount: total };
    } else if (daysUntilCheckIn >= 14) {
      return { percentage: 50, amount: total * 0.5 };
    } else if (daysUntilCheckIn >= 7) {
      return { percentage: 25, amount: total * 0.25 };
    }
    return { percentage: 0, amount: 0 };
  };

  const refund = calculateRefund();

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const reason = selectedReason === "other" ? customReason : 
        CANCELLATION_REASONS.find(r => r.value === selectedReason)?.label || "";

      // Fetch CSRF token
      const csrfResponse = await fetch('/api/csrf-token', {
        credentials: 'include'
      });
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel booking');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${bookingId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/guest'] });
      toast({
        title: "Booking cancelled",
        description: `Refund of $${data.refundAmount.toFixed(2)} will be processed within 5-7 business days`,
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCancel = () => {
    if (!selectedReason) {
      toast({
        title: "Reason required",
        description: "Please select a cancellation reason",
        variant: "destructive",
      });
      return;
    }

    if (selectedReason === "other" && !customReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for cancellation",
        variant: "destructive",
      });
      return;
    }

    cancelMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cancel Booking</DialogTitle>
          <DialogDescription>
            Please review our cancellation policy and provide a reason for cancellation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cancellation Policy */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Cancellation Policy:</strong><br />
              • 30+ days before: 100% refund<br />
              • 14-29 days before: 50% refund<br />
              • 7-13 days before: 25% refund<br />
              • Less than 7 days: No refund
            </AlertDescription>
          </Alert>

          {/* Refund Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Refund Preview</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Total Paid:</span>
                <span>${(parseFloat(totalAmount) + parseFloat(depositAmount)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-perra-red">
                <span>Refund Amount ({refund.percentage}%):</span>
                <span>${refund.amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label>Cancellation Reason</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Reason */}
          {selectedReason === "other" && (
            <div className="space-y-2">
              <Label>Please specify</Label>
              <Textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter your reason for cancellation"
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={cancelMutation.isPending}
          >
            Keep Booking
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              'Confirm Cancellation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
