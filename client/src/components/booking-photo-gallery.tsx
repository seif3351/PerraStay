import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BookingPhoto {
  id: string;
  bookingId: string;
  photoType: "check_in" | "check_out";
  photoUrl: string;
  description: string | null;
  uploadedAt: string;
}

interface BookingPhotoGalleryProps {
  bookingId: string;
  photoType: "check_in" | "check_out";
  canDelete?: boolean;
}

export function BookingPhotoGallery({
  bookingId,
  photoType,
  canDelete = false
}: BookingPhotoGalleryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: photos, isLoading } = useQuery<BookingPhoto[]>({
    queryKey: [`/api/bookings/${bookingId}/photos`, photoType],
    queryFn: async () => {
      const response = await fetch(`/api/bookings/${bookingId}/photos`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }
      const allPhotos = await response.json();
      return allPhotos.filter((p: BookingPhoto) => p.photoType === photoType);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const response = await fetch(`/api/bookings/${bookingId}/photos/${photoId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete photo');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate both check-in and check-out photo queries
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${bookingId}/photos`] });
      queryClient.invalidateQueries({ queryKey: [`/api/bookings/${bookingId}`] });
      toast({
        title: "Success!",
        description: "Photo deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-perra-gray" />
      </div>
    );
  }

  if (!photos || photos.length === 0) {
    return (
      <Card className="bg-gray-50">
        <CardContent className="flex flex-col items-center justify-center p-8">
          <ImageIcon className="h-12 w-12 text-perra-gray mb-2" />
          <p className="text-sm text-perra-gray text-center">
            No {photoType === 'check_in' ? 'check-in' : 'check-out'} photos uploaded yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {photos.map((photo) => (
        <div key={photo.id} className="relative group">
          <img
            src={photo.photoUrl}
            alt={photo.description || `${photoType} photo`}
            className="w-full h-32 object-cover rounded-lg"
          />
          {photo.description && (
            <p className="text-xs text-perra-gray mt-1 truncate">
              {photo.description}
            </p>
          )}
          <p className="text-xs text-perra-gray">
            {new Date(photo.uploadedAt).toLocaleDateString()}
          </p>
          
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete photo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the photo.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate(photo.id)}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      ))}
    </div>
  );
}
