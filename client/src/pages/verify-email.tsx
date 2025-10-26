import { useEffect, useState } from "react";
import { useLocation, useRouter } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { LoadingSpinner } from "@/components/ui/loading";

export default function VerifyEmail() {
  // Require authentication but no specific role
  const { isChecking } = useAuthGuard(true, false);

  // Show loading state while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const resendVerification = async () => {
    if (!userEmail) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Email address is required"
      });
      return;
    }

    setResending(true);
    try {
      // Get CSRF token
      const tokenResponse = await fetch('/api/csrf-token');
      if (!tokenResponse.ok) {
        throw new Error('Failed to get CSRF token');
      }
      const { csrfToken } = await tokenResponse.json();

      const response = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ email: userEmail })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to resend verification email');
      }

      toast({
        title: "Email sent",
        description: "A new verification email has been sent to your address."
      });
    } catch (error) {
      console.error('Resend error:', error);
      toast({
        variant: "destructive",
        title: "Failed to resend",
        description: error instanceof Error ? error.message : "Failed to resend verification email"
      });
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get token and email from URL
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        const email = params.get("email");

        if (!token) {
          throw new Error("Verification token is missing");
        }

        // Store email for resend functionality
        if (email) {
          setUserEmail(email);
        }

        // Call verification API
        const response = await fetch(`/api/verify-email/${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to verify email");
        }

        setSuccess(true);
        toast({
          title: "Email verified",
          description: "Your email has been successfully verified. You can now sign in.",
        });

        // Redirect to login page after 3 seconds
        setTimeout(() => {
          setLocation("/auth?mode=signin");
        }, 3000);
      } catch (error) {
        console.error("Verification error:", error);
        toast({
          variant: "destructive",
          title: "Verification failed",
          description: error instanceof Error ? error.message : "Failed to verify email",
        });
      } finally {
        setVerifying(false);
      }
    };

    verifyEmail();
  }, [setLocation, toast]);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          {verifying ? (
            <Alert>
              <AlertDescription>Verifying your email address...</AlertDescription>
            </Alert>
          ) : success ? (
            <Alert>
              <AlertDescription>
                Your email has been verified successfully! Redirecting you to login...
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to verify your email. The link may be invalid or expired.
                </AlertDescription>
              </Alert>
              
              {userEmail && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600 mb-3">
                    Didn't receive the verification email or link expired?
                  </p>
                  <button
                    onClick={resendVerification}
                    disabled={resending}
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {resending ? "Sending..." : "Resend verification email"}
                  </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}