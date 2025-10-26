import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";

interface BookingPhotoUploadProps {
  bookingId: string;
  photoType: "check_in" | "check_out";
  disabled?: boolean;
  onUploadComplete?: () => void;
}

export function BookingPhotoUpload({
  bookingId,
  photoType,
  disabled = false,
  onUploadComplete
}: BookingPhotoUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('photos', file);
      });
      formData.append('photoType', photoType);

      console.log('Uploading to:', `/api/bookings/${bookingId}/photos`);
      console.log('Photo type:', photoType);
      console.log('Files:', files.length);

      const response = await fetch(`/api/bookings/${bookingId}/photos`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response content-type:', response.headers.get('content-type'));

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to upload photos');
        } else {
          // Server returned HTML or other non-JSON response
          const text = await response.text();
          console.error('Server returned non-JSON response:', text.substring(0, 200));
          throw new Error('Server error - please check server logs');
        }
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${bookingId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${bookingId}/photos`] });
      toast({
        title: "Success!",
        description: `${photoType === 'check_in' ? 'Check-in' : 'Check-out'} photos uploaded successfully`,
      });
      setSelectedFiles([]);
      setPreviews([]);
      onUploadComplete?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    // Validate file types
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isUnder10MB = file.size <= 10 * 1024 * 1024; // 10MB limit
      
      if (!isImage) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image`,
          variant: "destructive",
        });
        return false;
      }
      
      if (!isUnder10MB) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });

    // Limit to 10 files total
    const totalFiles = selectedFiles.length + validFiles.length;
    if (totalFiles > 10) {
      toast({
        title: "Too many files",
        description: "Maximum 10 photos allowed",
        variant: "destructive",
      });
      return;
    }

    // Create previews
    const newPreviews: string[] = [];
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        if (newPreviews.length === validFiles.length) {
          setPreviews([...previews, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setSelectedFiles([...selectedFiles, ...validFiles]);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    handleFiles(files);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
    setPreviews(prevs => prevs.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) return;
    uploadMutation.mutate(selectedFiles);
  };

  return (
    <div className="space-y-4">
      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Drop Zone */}
      <Card
        className={`border-2 border-dashed ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer hover:border-perra-red'}`}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <CardContent className="flex flex-col items-center justify-center p-8">
          <Upload className="h-12 w-12 text-perra-gray mb-4" />
          <p className="text-center text-sm text-perra-gray">
            {disabled 
              ? "Photo upload is not available at this time"
              : "Click to select photos or drag and drop"
            }
          </p>
          <p className="text-center text-xs text-perra-gray mt-2">
            JPG, PNG, GIF up to 10MB (max 10 photos)
          </p>
        </CardContent>
      </Card>

      {/* Preview Grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                onClick={() => removeFile(index)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={uploadMutation.isPending}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {selectedFiles.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-perra-gray">
            {selectedFiles.length} photo{selectedFiles.length !== 1 ? 's' : ''} selected
          </p>
          <Button
            onClick={handleUpload}
            disabled={uploadMutation.isPending}
            className="bg-perra-gold hover:bg-perra-gold/90"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <ImageIcon className="mr-2 h-4 w-4" />
                Upload Photos
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
