import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PropertyAccessInfoForm } from "./property-access-info-form";
import { useToast } from "@/hooks/use-toast";
import type { PropertyAccessInfo } from "@shared/schema";

interface PropertyAccessInfoDialogProps {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PropertyAccessInfoDialog({
  propertyId,
  open,
  onOpenChange,
}: PropertyAccessInfoDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing access info
  const { data: accessInfo, isLoading: isLoadingAccessInfo } = useQuery<PropertyAccessInfo | null>({
    queryKey: [`/api/properties/${propertyId}/access-info`],
    queryFn: async () => {
      const response = await fetch(`/api/properties/${propertyId}/access-info`, {
        credentials: 'include'
      });
      if (response.status === 404) {
        return null; // No access info yet
      }
      if (!response.ok) {
        throw new Error('Failed to fetch access info');
      }
      return response.json();
    },
    enabled: open && !!propertyId,
  });

  // Create or update access info mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // Fetch CSRF token first
      const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
      const { csrfToken } = await csrfResponse.json();
      
      const method = accessInfo ? 'PUT' : 'POST';
      const response = await fetch(`/api/properties/${propertyId}/access-info`, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        // Try to get JSON error, but handle HTML responses
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to save access info');
        } else {
          // Server returned HTML (likely an error page)
          const text = await response.text();
          console.error('Server returned HTML instead of JSON:', text.substring(0, 200));
          throw new Error(`Server error (${response.status}): Check console for details`);
        }
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${propertyId}/access-info`] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] }); // Refresh bookings to show updated access info
      toast({
        title: "Success!",
        description: accessInfo ? "Access information updated successfully" : "Access information added successfully",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (data: any) => {
    await saveMutation.mutateAsync(data);
  };

  // Convert null values to undefined for form compatibility
  const formData = accessInfo ? {
    doorCode: accessInfo.doorCode || undefined,
    gateCode: accessInfo.gateCode || undefined,
    wifiName: accessInfo.wifiName || undefined,
    wifiPassword: accessInfo.wifiPassword || undefined,
    keyPickupLocation: accessInfo.keyPickupLocation || undefined,
    emergencyContact: accessInfo.emergencyContact || undefined,
    emergencyContactPhone: accessInfo.emergencyContactPhone || undefined,
    houseRules: accessInfo.houseRules || undefined,
    checkInInstructions: accessInfo.checkInInstructions || undefined,
    googleMapsLinks: accessInfo.googleMapsLinks || undefined,
    welcomeBoxUrl: accessInfo.welcomeBoxUrl || undefined,
    welcomeBoxDescription: accessInfo.welcomeBoxDescription || undefined,
  } : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {accessInfo ? "Edit Property Access Information" : "Add Property Access Information"}
          </DialogTitle>
          <DialogDescription>
            Provide access details that will be shared with guests after their booking is confirmed.
            This information is saved per property and can be reused for all future bookings.
          </DialogDescription>
        </DialogHeader>
        
        {isLoadingAccessInfo ? (
          <div className="flex justify-center py-8">
            <p className="text-perra-gray">Loading...</p>
          </div>
        ) : (
          <PropertyAccessInfoForm
            propertyId={propertyId}
            initialData={formData}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            isLoading={saveMutation.isPending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
