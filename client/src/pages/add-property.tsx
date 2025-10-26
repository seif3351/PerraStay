import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertPropertySchema, type InsertProperty } from "@shared/schema";
import { z } from "zod";
import { Home, MapPin, DollarSign, Bed, Bath, Wifi, Zap, Coffee, Snowflake, Briefcase, Camera, Plus, X } from "lucide-react";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { LoadingSpinner } from "@/components/ui/loading";

const propertyFormSchema = insertPropertySchema.extend({
  images: insertPropertySchema.shape.images.optional(),
  amenities: insertPropertySchema.shape.amenities.optional(),
  title: z.string().min(1, "Property title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.string().min(1, "Location is required"),
  monthlyPrice: z.string().min(1, "Monthly price is required").regex(/^\d+(\.\d{1,2})?$/, "Please enter a valid price"),
  depositAmount: z.string().min(1, "Deposit amount is required").regex(/^\d+(\.\d{1,2})?$/, "Please enter a valid deposit amount"),
});

type PropertyFormData = z.infer<typeof propertyFormSchema>;

export default function AddProperty() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customAmenities, setCustomAmenities] = useState<string[]>([]);
  const [newAmenity, setNewAmenity] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Check authentication and host status (require auth AND host privileges)
  const { isChecking, user } = useAuthGuard(true, true);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Upload image to server
  const uploadImage = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const imageUrl = data.url; // Assuming the server returns { url: "..." }
      setImageUrls(prev => [...prev, imageUrl]);
      setSelectedFile(null);
      
      // Clear the file input
      const fileInput = document.getElementById('image-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      monthlyPrice: "",
      depositAmount: "",
      bedrooms: 1,
      bathrooms: 1,
      images: [],
      amenities: [],
      hostId: user?.id || "",
      internetSpeed: null,
      hasStableElectricity: true,
      hasKitchen: true,
      hasWorkspace: false,
      hasAC: false,
      hasCoffeeMachine: false,
      isVerified: false,
    },
  });

  // Update hostId when user data loads
  useEffect(() => {
    if (user?.id) {
      form.setValue('hostId', user.id);
    }
  }, [user?.id, form]);

  const createPropertyMutation = useMutation({
    mutationFn: async (data: Omit<PropertyFormData, 'hostId'> & { images: string[]; amenities: string[] }) => {
      // Get fresh CSRF token
      const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
      const { csrfToken } = await csrfResponse.json();
      
      // Make the request with CSRF token
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      
      return res;
    },
    onSuccess: (newProperty) => {
      toast({
        title: "Success!",
        description: "Your property has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties/host'] });
      setLocation('/host-dashboard');
    },
    onError: (error) => {
      console.error('Error creating property:', error);
      toast({
        title: "Error",
        description: "Failed to add property. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Show loading state while checking auth - AFTER all hooks
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const onSubmit = (data: PropertyFormData) => {
    console.log('Form submitted with data:', data);
    console.log('Image URLs:', imageUrls);
    console.log('Custom amenities:', customAmenities);
    console.log('User ID:', user?.id);
    
    // Ensure required fields are not empty
    if (!data.monthlyPrice || !data.depositAmount || !data.description || !data.location) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields: description, location, monthly price, and deposit amount.",
        variant: "destructive",
      });
      return;
    }

    // Convert form data to property data with correct types and validation
    if (imageUrls.length === 0) {
      toast({
        title: "Images Required",
        description: "Please upload at least one image of your property.",
        variant: "destructive",
      });
      return;
    }

    // Convert relative URLs to full URLs
    const fullImageUrls = imageUrls.map(url => {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      // Convert relative URL to full URL using localhost (not 127.0.0.1)
      return `http://localhost:3000${url}`;
    });

    const propertyData = {
      hostId: user?.id || data.hostId, // Use user ID from auth
      title: data.title.trim(),
      description: data.description.trim(),
      location: data.location.trim(),
      monthlyPrice: data.monthlyPrice,  // Keep as string, server will parse
      depositAmount: data.depositAmount, // Keep as string, server will parse
      bedrooms: Number(data.bedrooms),
      bathrooms: Number(data.bathrooms),
      internetSpeed: data.internetSpeed ? Number(data.internetSpeed) : undefined,
      hasStableElectricity: Boolean(data.hasStableElectricity),
      hasKitchen: Boolean(data.hasKitchen),
      hasWorkspace: Boolean(data.hasWorkspace),
      hasAC: Boolean(data.hasAC),
      hasCoffeeMachine: Boolean(data.hasCoffeeMachine),
      images: fullImageUrls,
      amenities: customAmenities.map(a => a.trim()).filter(Boolean)
    };
    
    console.log('Property data to submit:', propertyData);
    
    // The server will handle hostId from the session
    createPropertyMutation.mutate(propertyData);
  };

  const removeImageUrl = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const addCustomAmenity = () => {
    if (newAmenity.trim() && !customAmenities.includes(newAmenity.trim())) {
      setCustomAmenities([...customAmenities, newAmenity.trim()]);
      setNewAmenity("");
    }
  };

  const handleUpload = () => {
    if (imageUrls.length >= 10) {
      toast({
        title: "Maximum Images Reached",
        description: "You can upload a maximum of 10 images per property.",
        variant: "destructive",
      });
      return;
    }
    uploadImage();
  };

  const removeCustomAmenity = (index: number) => {
    setCustomAmenities(customAmenities.filter((_, i) => i !== index));
  };

  // Add validation error handler
  const onInvalid = (errors: any) => {
    console.log('Form validation errors:', errors);
    toast({
      title: "Form Validation Failed",
      description: "Please check all required fields and fix any errors.",
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Your Property</h1>
          <p className="text-perra-gray">Create a detailed listing for your medium-term rental property</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Provide the essential details about your property
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Modern Downtown Loft" {...field} />
                      </FormControl>
                      <FormDescription>
                        Choose a descriptive title that highlights your property's best features
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your property, including what makes it special for medium-term stays..."
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Detailed description of the property, amenities, and neighborhood
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Location
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="San Francisco, CA" {...field} />
                      </FormControl>
                      <FormDescription>
                        City and state/country where the property is located
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Pricing & Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Pricing & Property Details
                </CardTitle>
                <CardDescription>
                  Set your pricing and property specifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="monthlyPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Price (USD)</FormLabel>
                        <FormControl>
                          <Input placeholder="2450.00" {...field} />
                        </FormControl>
                        <FormDescription>
                          Monthly rental price in USD
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="depositAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Security Deposit (USD)</FormLabel>
                        <FormControl>
                          <Input placeholder="1200.00" {...field} />
                        </FormControl>
                        <FormDescription>
                          Security deposit amount
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bedrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Bed className="w-4 h-4" />
                          Bedrooms
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            {...field} 
                            onChange={e => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bathrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Bath className="w-4 h-4" />
                          Bathrooms
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            {...field} 
                            onChange={e => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="internetSpeed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Wifi className="w-4 h-4" />
                          Internet Speed (Mbps)
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            placeholder="100"
                            value={field.value || ""} 
                            onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormDescription>
                          Optional: Internet speed in Mbps
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Amenities */}
            <Card>
              <CardHeader>
                <CardTitle>Property Features</CardTitle>
                <CardDescription>
                  Select the amenities and features available at your property
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="hasStableElectricity"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Stable Electricity
                          </FormLabel>
                          <FormDescription>
                            Reliable power supply with minimal outages
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasKitchen"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Full Kitchen</FormLabel>
                          <FormDescription>
                            Complete kitchen with appliances
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasWorkspace"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            Dedicated Workspace
                          </FormLabel>
                          <FormDescription>
                            Desk and workspace area for remote work
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasAC"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Snowflake className="w-4 h-4" />
                            Air Conditioning
                          </FormLabel>
                          <FormDescription>
                            Climate control system
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasCoffeeMachine"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center gap-2">
                            <Coffee className="w-4 h-4" />
                            Coffee Machine
                          </FormLabel>
                          <FormDescription>
                            Coffee maker or espresso machine
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Custom Amenities */}
                <div>
                  <FormLabel>Additional Amenities</FormLabel>
                  <FormDescription className="mb-3">
                    Add custom amenities that make your property special
                  </FormDescription>
                  
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="Enter amenity (e.g., City View, Gym Access)"
                      value={newAmenity}
                      onChange={(e) => setNewAmenity(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomAmenity();
                        }
                      }}
                    />
                    <Button type="button" onClick={addCustomAmenity} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {customAmenities.map((amenity, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {amenity}
                        <button
                          type="button"
                          onClick={() => removeCustomAmenity(index)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Property Images
                </CardTitle>
                <CardDescription>
                  Upload images to showcase your property
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Upload Section */}
                  <div className="flex flex-col gap-4">
                    <FormLabel>Property Images</FormLabel>
                    <FormDescription>
                      Upload high-quality images of your property (max 10 images, 5MB each). Include photos of:
                      • Main living areas
                      • Bedrooms
                      • Kitchen
                      • Bathrooms
                      • Workspace/amenities
                    </FormDescription>
                    
                    {/* Upload Controls */}
                    <div className="flex gap-2 items-center">
                      <Input
                        type="file"
                        id="image-upload"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileSelect}
                        className="flex-1"
                      />
                      <Button 
                        type="button"
                        onClick={handleUpload}
                        disabled={!selectedFile || isUploading}
                        className="whitespace-nowrap"
                      >
                        {isUploading ? (
                          <>
                            <span className="animate-spin mr-2">⌛</span>
                            Uploading...
                          </>
                        ) : (
                          'Upload Image'
                        )}
                      </Button>
                    </div>

                    {/* Upload Requirements */}
                    <div className="text-sm text-gray-500 space-y-1">
                      <p>• Maximum file size: 5MB</p>
                      <p>• Supported formats: JPEG, PNG, WebP</p>
                      <p>• Currently uploaded: {imageUrls.length}/10 images</p>
                    </div>
                  </div>

                  {/* Image Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {imageUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Property image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                          onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeImageUrl(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <Card className="sticky bottom-4 bg-white shadow-lg border-2">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation('/host-dashboard')}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-perra-gold hover:bg-perra-gold/90 text-white font-semibold"
                    disabled={createPropertyMutation.isPending}

                  >
                    {createPropertyMutation.isPending ? "Adding Property..." : "Add Property"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  );
}