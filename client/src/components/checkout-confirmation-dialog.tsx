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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface CheckoutConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  depositAmount: string;
  guestName: string;
  onSuccess?: () => void;
}

const PROPERTY_CONDITIONS = [
  { 
    value: "excellent", 
    label: "Excellent", 
    description: "Property is in pristine condition, no issues",
    depositRefund: true,
  },
  { 
    value: "good", 
    label: "Good", 
    description: "Property is in good condition, minor wear is normal",
    depositRefund: true,
  },
  { 
    value: "fair", 
    label: "Fair", 
    description: "Property has some minor issues but no significant damage",
    depositRefund: false,
  },
  { 
    value: "poor", 
    label: "Poor", 
    description: "Property has noticeable issues or cleanliness concerns",
    depositRefund: false,
  },
  { 
    value: "damaged", 
    label: "Damaged", 
    description: "Property has significant damage requiring repairs",
    depositRefund: false,
  },
];

export function CheckoutConfirmationDialog({
  open,
  onOpenChange,
  bookingId,
  depositAmount,
  guestName,
  onSuccess,
}: CheckoutConfirmationDialogProps) {
  const [propertyCondition, setPropertyCondition] = useState("");
  const [damagesReported, setDamagesReported] = useState(false);
  const [damageDescription, setDamageDescription] = useState("");
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const selectedCondition = PROPERTY_CONDITIONS.find(c => c.value === propertyCondition);
  const willRefundDeposit = selectedCondition?.depositRefund && !damagesReported;

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      // Fetch CSRF token
      const csrfResponse = await fetch('/api/csrf-token', {
        credentials: 'include'
      });
      const { csrfToken } = await csrfResponse.json();

      const response = await fetch(`/api/bookings/${bookingId}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          propertyCondition,
          damagesReported,
          damageDescription: damagesReported ? damageDescription : undefined,
          checkoutNotes: checkoutNotes || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to confirm checkout');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${bookingId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/host'] });
      toast({
        title: "Checkout confirmed",
        description: data.message,
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Checkout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConfirm = () => {
    if (!propertyCondition) {
      toast({
        title: "Property condition required",
        description: "Please select the property condition",
        variant: "destructive",
      });
      return;
    }

    if (damagesReported && !damageDescription.trim()) {
      toast({
        title: "Damage description required",
        description: "Please describe the damages reported",
        variant: "destructive",
      });
      return;
    }

    checkoutMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Checkout</DialogTitle>
          <DialogDescription>
            Review the property condition after {guestName}'s stay
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Property Condition */}
          <div className="space-y-3">
            <Label>Property Condition</Label>
            <RadioGroup value={propertyCondition} onValueChange={setPropertyCondition}>
              {PROPERTY_CONDITIONS.map((condition) => (
                <div
                  key={condition.value}
                  className={`flex items-start space-x-3 p-3 rounded-lg border ${
                    propertyCondition === condition.value 
                      ? 'border-perra-gold bg-amber-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <RadioGroupItem value={condition.value} id={condition.value} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={condition.value} className="cursor-pointer">
                      <div className="font-semibold">{condition.label}</div>
                      <div className="text-sm text-gray-500">{condition.description}</div>
                      {condition.depositRefund && (
                        <div className="text-xs text-green-600 mt-1 flex items-center">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Eligible for deposit refund
                        </div>
                      )}
                    </Label>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Damages Checkbox */}
          <div className="flex items-start space-x-3 p-3 border rounded-lg">
            <Checkbox
              id="damages"
              checked={damagesReported}
              onCheckedChange={(checked) => setDamagesReported(checked as boolean)}
            />
            <div className="flex-1">
              <Label htmlFor="damages" className="cursor-pointer font-medium">
                Damages or issues found
              </Label>
              <p className="text-sm text-gray-500">
                Check this if you found any damages or issues during checkout
              </p>
            </div>
          </div>

          {/* Damage Description */}
          {damagesReported && (
            <div className="space-y-2">
              <Label>Damage Description</Label>
              <Textarea
                value={damageDescription}
                onChange={(e) => setDamageDescription(e.target.value)}
                placeholder="Describe the damages found (e.g., broken furniture, stains, missing items)"
                rows={3}
                className="resize-none"
              />
            </div>
          )}

          {/* Checkout Notes */}
          <div className="space-y-2">
            <Label>Checkout Notes (Optional)</Label>
            <Textarea
              value={checkoutNotes}
              onChange={(e) => setCheckoutNotes(e.target.value)}
              placeholder="Any additional notes about the checkout (e.g., cleanliness, guest behavior)"
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Deposit Refund Preview */}
          {propertyCondition && (
            <Alert className={willRefundDeposit ? "border-green-500 bg-green-50" : "border-amber-500 bg-amber-50"}>
              {willRefundDeposit ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
              <AlertDescription className="text-sm">
                {willRefundDeposit ? (
                  <>
                    <strong className="text-green-700">Deposit will be refunded:</strong><br />
                    ${parseFloat(depositAmount).toFixed(2)} will be returned to the guest within 5-7 business days
                  </>
                ) : (
                  <>
                    <strong className="text-amber-700">Deposit will NOT be refunded:</strong><br />
                    ${parseFloat(depositAmount).toFixed(2)} will be retained due to {damagesReported ? 'reported damages' : 'property condition'}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={checkoutMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={checkoutMutation.isPending}
          >
            {checkoutMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              'Confirm Checkout'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
