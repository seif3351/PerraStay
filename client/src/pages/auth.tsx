import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl, FormDescription } from "@/components/ui/form";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const signUpSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: passwordSchema,
  isHost: z.boolean().default(false),
});

const resetRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;
type ResetRequestData = z.infer<typeof resetRequestSchema>;
type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset-request' | 'reset-password' | 'verify-email'>('signin');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockoutTime, setLockoutTime] = useState<Date | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check URL parameters to determine initial mode and tokens
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get('mode');
    const signupParam = urlParams.get('signup');
    const verifyToken = urlParams.get('verify');
    const resetToken = urlParams.get('reset');
    
    if (verifyToken) {
      setVerificationToken(verifyToken);
      setMode('verify-email');
    } else if (resetToken) {
      setResetToken(resetToken);
      setMode('reset-password');
    } else if (modeParam === 'signup' || signupParam === 'true') {
      setMode('signup');
    }
  }, []);

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      isHost: false,
    },
  });

  const resetRequestForm = useForm<ResetRequestData>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: {
      email: "",
    },
  });

  const resetPasswordForm = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onRequestReset = async (data: ResetRequestData) => {
    try {
      const response = await fetch('/api/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Password reset request failed');
      }

      toast({
        title: 'Reset email sent',
        description: 'Please check your email for password reset instructions.',
      });
      setMode('signin');
    } catch (error) {
      toast({
        title: 'Reset request failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const onResetPassword = async (data: ResetPasswordData) => {
    if (!resetToken) {
      toast({
        title: 'Reset failed',
        description: 'Invalid reset token. Please request a new password reset.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`/api/reset-password/${resetToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Password reset failed');
      }

      toast({
        title: 'Password reset successful',
        description: 'You can now sign in with your new password.',
      });
      setMode('signin');
    } catch (error) {
      toast({
        title: 'Reset failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const verifyEmail = async () => {
    if (!verificationToken) {
      toast({
        title: 'Verification failed',
        description: 'Invalid verification token. Please request a new verification email.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`/api/verify-email/${verificationToken}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Email verification failed');
      }

      toast({
        title: 'Email verified',
        description: 'Your email has been verified. You can now sign in.',
      });
      setMode('signin');
    } catch (error) {
      toast({
        title: 'Verification failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  // Auto-verify email when token is present
  useEffect(() => {
    if (mode === 'verify-email' && verificationToken) {
      verifyEmail();
    }
  }, [mode, verificationToken]);

  const onSignIn = async (data: SignInFormData) => {
    if (lockoutTime && new Date() < lockoutTime) {
      const timeLeft = Math.ceil((lockoutTime.getTime() - new Date().getTime()) / 1000 / 60);
      toast({
        title: 'Account locked',
        description: `Too many failed attempts. Please try again in ${timeLeft} minutes.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include', // Include cookies
      });
      
      if (!response.ok) {
        const error = await response.json();
        
        if (error.remainingAttempts !== undefined) {
          setRemainingAttempts(error.remainingAttempts);
        }
        
        if (error.lockoutUntil) {
          setLockoutTime(new Date(error.lockoutUntil));
        }
        
        throw new Error(error.message || 
          (error.remainingAttempts 
            ? `Sign in failed. ${error.remainingAttempts} attempts remaining.` 
            : 'Sign in failed'));
      }
      
      // Reset login attempt counters on successful login
      setRemainingAttempts(null);
      setLockoutTime(null);
      
      const result = await response.json();
      const user = result.user || result; // Handle both new and legacy response formats
      
      // Store user data (authentication handled by httpOnly cookie)
      localStorage.setItem('user', JSON.stringify(user));
      
      // Trigger storage event to update header component
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'user',
        newValue: JSON.stringify(user),
        oldValue: null,
        storageArea: localStorage
      }));
      
      toast({
        title: 'Signed in!',
        description: `Welcome back, ${user.firstName}!`,
      });
      setLocation(user.isHost ? '/host-dashboard' : '/guest-dashboard');
    } catch (error) {
      toast({
        title: 'Sign in failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const onSignUp = async (data: SignUpFormData) => {
    try {
      // First, create the user account
      const signUpResponse = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!signUpResponse.ok) {
        const error = await signUpResponse.json();
        // Handle specific error cases
        if (error.code === 'EMAIL_EXISTS') {
          throw new Error('An account with this email already exists.');
        }
        throw new Error(error.message || 'Registration failed');
      }
      
      const user = await signUpResponse.json();
      
      toast({
        title: 'Account created!',
        description: 'Please check your email to verify your account.',
      });
      
      // Don't automatically sign in - wait for email verification
      setMode('signin');
      
      // Just show the verification message
      toast({
        title: 'Account created!',
        description: 'Please check your email to verify your account.',
      });
      
      // Don't redirect - wait for email verification
      setMode('signin');
    } catch (error) {
      toast({
        title: 'Sign up failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-perra-light py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-heading font-bold text-perra-dark">
            {mode === 'signin' && 'Sign In'}
            {mode === 'signup' && 'Sign Up'}
            {mode === 'reset-request' && 'Reset Password'}
            {mode === 'reset-password' && 'Set New Password'}
            {mode === 'verify-email' && 'Verify Email'}
          </CardTitle>
          <p className="text-perra-gray mt-2">
            {mode === 'signin' && 'Welcome back to Perra'}
            {mode === 'signup' && 'Create your Perra account'}
            {mode === 'reset-request' && 'Request a password reset link'}
            {mode === 'reset-password' && 'Enter your new password'}
            {mode === 'verify-email' && 'Verifying your email address'}
          </p>
        </CardHeader>
        <CardContent>
          {mode === 'signin' ? (
            <Form {...signInForm}>
              <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-4" data-testid="form-signin">
                <FormField
                  control={signInForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          autoComplete="email"
                          data-testid="input-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signInForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          data-testid="input-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-perra-gold hover:bg-perra-gold/90 text-white font-semibold"
                  disabled={signInForm.formState.isSubmitting}
                  data-testid="button-signin"
                >
                  {signInForm.formState.isSubmitting ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...signUpForm}>
              <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-4" data-testid="form-signup">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={signUpForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="First name"
                            data-testid="input-firstname"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Last name"
                            data-testid="input-lastname"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <label htmlFor="signup-email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Email
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    autoComplete="email"
                    data-testid="input-email-signup"
                    {...signUpForm.register('email')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm mt-2"
                  />
                  {signUpForm.formState.errors.email && (
                    <p className="text-sm font-medium text-destructive mt-2">
                      {signUpForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <FormField
                  control={signUpForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Create a password (min 6 characters)"
                          data-testid="input-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signUpForm.control}
                  name="isHost"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Account Type</FormLabel>
                        <FormDescription>
                          {field.value ? "Sign up as a property host" : "Sign up as a guest"}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-account-type"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-perra-gold hover:bg-perra-gold/90 text-white font-semibold"
                  disabled={signUpForm.formState.isSubmitting}
                  data-testid="button-signup"
                >
                  {signUpForm.formState.isSubmitting ? 'Creating Account...' : 'Sign Up'}
                </Button>
              </form>
            </Form>
          )}
          
          {mode === 'verify-email' && (
            <div className="text-center">
              <p className="text-sm text-perra-gray mt-4">
                Verifying your email address...
              </p>
            </div>
          )}

          {mode === 'reset-request' && (
            <Form {...resetRequestForm}>
              <form onSubmit={resetRequestForm.handleSubmit(onRequestReset)} className="space-y-4">
                <FormField
                  control={resetRequestForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-perra-gold hover:bg-perra-gold/90 text-white font-semibold"
                  disabled={resetRequestForm.formState.isSubmitting}
                >
                  {resetRequestForm.formState.isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            </Form>
          )}

          {mode === 'reset-password' && (
            <Form {...resetPasswordForm}>
              <form onSubmit={resetPasswordForm.handleSubmit(onResetPassword)} className="space-y-4">
                <FormField
                  control={resetPasswordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter new password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={resetPasswordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirm new password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-perra-gold hover:bg-perra-gold/90 text-white font-semibold"
                  disabled={resetPasswordForm.formState.isSubmitting}
                >
                  {resetPasswordForm.formState.isSubmitting ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>
            </Form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-perra-gray">
              {mode === 'signin' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    className="text-perra-gold hover:underline font-medium"
                    onClick={() => setMode('signup')}
                    data-testid="button-switch-signup"
                  >
                    Sign Up
                  </button>
                </>
              ) : mode === 'signup' ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="text-perra-gold hover:underline font-medium"
                    onClick={() => setMode('signin')}
                    data-testid="button-switch-signin"
                  >
                    Sign In
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="text-perra-gold hover:underline font-medium"
                  onClick={() => setMode('signin')}
                >
                  Back to Sign In
                </button>
              )}
            </p>
            {mode === 'signin' && (
              <div className="space-y-2">
                <p className="text-sm text-perra-gray mt-2">
                  <button
                    type="button"
                    className="text-perra-gold hover:underline font-medium"
                    onClick={() => setMode('reset-request')}
                  >
                    Forgot your password?
                  </button>
                </p>
                <p className="text-sm text-perra-gray">
                  <button
                    type="button"
                    className="text-perra-gold hover:underline font-medium"
                    onClick={async () => {
                      try {
                        const email = signInForm.getValues('email');
                        if (!email) {
                          toast({
                            title: 'Email required',
                            description: 'Please enter your email address first.',
                            variant: 'destructive',
                          });
                          return;
                        }
                        
                        const response = await fetch('/api/resend-verification', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email }),
                        });
                        
                        if (!response.ok) {
                          const error = await response.json();
                          throw new Error(error.message || 'Failed to resend verification email');
                        }
                        
                        toast({
                          title: 'Verification email sent',
                          description: 'Please check your email for the verification link.',
                        });
                      } catch (error) {
                        toast({
                          title: 'Failed to resend',
                          description: error instanceof Error ? error.message : 'Please try again',
                          variant: 'destructive',
                        });
                      }
                    }}
                  >
                    Resend verification email
                  </button>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}