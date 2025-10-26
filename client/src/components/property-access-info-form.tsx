import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wifi, Key, Phone, AlertCircle, MapPin, Clock, Gift, Plus, X } from "lucide-react";
import { useState } from "react";

// Form validation schema matching the database schema
const propertyAccessInfoSchema = z.object({
  doorCode: z.string().optional().or(z.literal('')),
  gateCode: z.string().optional().or(z.literal('')),
  wifiName: z.string().optional().or(z.literal('')),
  wifiPassword: z.string().optional().or(z.literal('')),
  keyPickupLocation: z.string().optional().or(z.literal('')),
  emergencyContact: z.string().optional().or(z.literal('')),
  emergencyContactPhone: z.string().optional().or(z.literal('')),
  houseRules: z.string().optional().or(z.literal('')),
  checkInInstructions: z.string().optional().or(z.literal('')),
  googleMapsLinks: z.array(z.string().url()).optional(),
  welcomeBoxUrl: z.string().url().optional().or(z.literal('')),
  welcomeBoxDescription: z.string().optional().or(z.literal('')),
});

type PropertyAccessInfoFormData = z.infer<typeof propertyAccessInfoSchema>;

interface PropertyAccessInfoFormProps {
  propertyId: string;
  initialData?: PropertyAccessInfoFormData;
  onSubmit: (data: PropertyAccessInfoFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function PropertyAccessInfoForm({
  propertyId,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: PropertyAccessInfoFormProps) {
  const [googleMapsLinks, setGoogleMapsLinks] = useState<string[]>(initialData?.googleMapsLinks || []);
  const [newMapLink, setNewMapLink] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PropertyAccessInfoFormData>({
    resolver: zodResolver(propertyAccessInfoSchema),
    defaultValues: initialData || {},
  });

  const handleFormSubmit = async (data: PropertyAccessInfoFormData) => {
    // Clean up empty strings - convert to undefined for optional fields
    const cleanedData = Object.fromEntries(
      Object.entries({
        ...data,
        googleMapsLinks: googleMapsLinks.length > 0 ? googleMapsLinks : undefined,
      }).filter(([_, value]) => value !== '' && value !== null)
    );
    
    await onSubmit(cleanedData as PropertyAccessInfoFormData);
  };

  const addMapLink = () => {
    if (newMapLink.trim() && googleMapsLinks.length < 10) {
      try {
        new URL(newMapLink); // Validate URL
        setGoogleMapsLinks([...googleMapsLinks, newMapLink.trim()]);
        setNewMapLink("");
      } catch {
        // Invalid URL, don't add
      }
    }
  };

  const removeMapLink = (index: number) => {
    setGoogleMapsLinks(googleMapsLinks.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Access Codes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Access Codes
          </CardTitle>
          <CardDescription>
            Provide door, gate, and parking codes for guest access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="doorCode">Door Code</Label>
            <Input
              id="doorCode"
              {...register("doorCode")}
              placeholder="e.g., #1234"
              disabled={isLoading}
            />
            {errors.doorCode && (
              <p className="text-sm text-red-500 mt-1">{errors.doorCode.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="gateCode">Gate Code</Label>
            <Input
              id="gateCode"
              {...register("gateCode")}
              placeholder="e.g., *5678#"
              disabled={isLoading}
            />
            {errors.gateCode && (
              <p className="text-sm text-red-500 mt-1">{errors.gateCode.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* WiFi Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            WiFi Information
          </CardTitle>
          <CardDescription>
            Share WiFi network credentials with guests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="wifiName">WiFi Network Name</Label>
            <Input
              id="wifiName"
              {...register("wifiName")}
              placeholder="e.g., MyHomeNetwork"
              disabled={isLoading}
            />
            {errors.wifiName && (
              <p className="text-sm text-red-500 mt-1">{errors.wifiName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="wifiPassword">WiFi Password</Label>
            <Input
              id="wifiPassword"
              type="text"
              {...register("wifiPassword")}
              placeholder="Enter WiFi password"
              disabled={isLoading}
            />
            {errors.wifiPassword && (
              <p className="text-sm text-red-500 mt-1">{errors.wifiPassword.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Key Pickup & Emergency Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Key Pickup & Emergency Contact
          </CardTitle>
          <CardDescription>
            Instructions for key collection and emergency contact information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="keyPickupLocation">Key Pickup Location</Label>
            <Textarea
              id="keyPickupLocation"
              {...register("keyPickupLocation")}
              placeholder="e.g., Keys are in the lockbox at the front door. Code is 1234."
              disabled={isLoading}
              rows={3}
            />
            {errors.keyPickupLocation && (
              <p className="text-sm text-red-500 mt-1">{errors.keyPickupLocation.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
            <Input
              id="emergencyContact"
              {...register("emergencyContact")}
              placeholder="e.g., John Doe"
              disabled={isLoading}
            />
            {errors.emergencyContact && (
              <p className="text-sm text-red-500 mt-1">{errors.emergencyContact.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
            <Input
              id="emergencyContactPhone"
              type="tel"
              {...register("emergencyContactPhone")}
              placeholder="e.g., +1 (555) 123-4567"
              disabled={isLoading}
            />
            {errors.emergencyContactPhone && (
              <p className="text-sm text-red-500 mt-1">{errors.emergencyContactPhone.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Check-in Instructions & House Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Check-in Instructions & House Rules
          </CardTitle>
          <CardDescription>
            Detailed instructions for guests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="checkInInstructions">Check-in Instructions</Label>
            <Textarea
              id="checkInInstructions"
              {...register("checkInInstructions")}
              placeholder="Detailed step-by-step check-in instructions..."
              disabled={isLoading}
              rows={5}
            />
            {errors.checkInInstructions && (
              <p className="text-sm text-red-500 mt-1">{errors.checkInInstructions.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="houseRules">House Rules</Label>
            <Textarea
              id="houseRules"
              {...register("houseRules")}
              placeholder="e.g., No smoking, no pets, quiet hours 10 PM - 7 AM..."
              disabled={isLoading}
              rows={5}
            />
            {errors.houseRules && (
              <p className="text-sm text-red-500 mt-1">{errors.houseRules.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Google Maps Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Nearby Places (Google Maps Links)
          </CardTitle>
          <CardDescription>
            Share helpful nearby locations (restaurants, grocery stores, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newMapLink}
              onChange={(e) => setNewMapLink(e.target.value)}
              placeholder="Paste Google Maps link..."
              disabled={isLoading || googleMapsLinks.length >= 10}
            />
            <Button
              type="button"
              onClick={addMapLink}
              disabled={isLoading || googleMapsLinks.length >= 10 || !newMapLink.trim()}
              size="icon"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {googleMapsLinks.length > 0 && (
            <div className="space-y-2">
              {googleMapsLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span className="flex-1 text-sm truncate">{link}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMapLink(index)}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <p className="text-sm text-gray-500">
            {googleMapsLinks.length}/10 links added
          </p>
        </CardContent>
      </Card>

      {/* Welcome Box */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Welcome Box (Optional)
          </CardTitle>
          <CardDescription>
            Share a Google Drive folder with discount coupons, recommendations, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="welcomeBoxUrl">Welcome Box URL (Google Drive link)</Label>
            <Input
              id="welcomeBoxUrl"
              type="url"
              {...register("welcomeBoxUrl")}
              placeholder="https://drive.google.com/..."
              disabled={isLoading}
            />
            {errors.welcomeBoxUrl && (
              <p className="text-sm text-red-500 mt-1">{errors.welcomeBoxUrl.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="welcomeBoxDescription">Welcome Box Description</Label>
            <Textarea
              id="welcomeBoxDescription"
              {...register("welcomeBoxDescription")}
              placeholder="e.g., Discount coupons for local restaurants and attractions"
              disabled={isLoading}
              rows={3}
            />
            {errors.welcomeBoxDescription && (
              <p className="text-sm text-red-500 mt-1">{errors.welcomeBoxDescription.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : initialData ? "Update Access Info" : "Save Access Info"}
        </Button>
      </div>
    </form>
  );
}
