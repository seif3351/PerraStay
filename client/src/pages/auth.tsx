import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error('Sign up failed');
        toast({ title: 'Account created!', description: 'You can now sign in.' });
        setMode('signin');
      } else {
        const res = await fetch('/api/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        if (!res.ok) throw new Error('Sign in failed');
        const user = await res.json();
        localStorage.setItem('user', JSON.stringify(user));
        toast({ title: 'Signed in!', description: `Welcome, ${user.firstName}` });
        setLocation('/guest-dashboard');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-perra-dark mb-2">
            {mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'signup' && (
              <>
                <FormField>
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <Input name="firstName" value={form.firstName} onChange={handleChange} required />
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField>
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <Input name="lastName" value={form.lastName} onChange={handleChange} required />
                    <FormMessage />
                  </FormItem>
                </FormField>
              </>
            )}
            <FormField>
              <FormItem>
                <FormLabel>Email</FormLabel>
                <Input type="email" name="email" value={form.email} onChange={handleChange} required />
                <FormMessage />
              </FormItem>
            </FormField>
            <FormField>
              <FormItem>
                <FormLabel>Password</FormLabel>
                <Input type="password" name="password" value={form.password} onChange={handleChange} required />
                <FormMessage />
              </FormItem>
            </FormField>
            <Button type="submit" className="w-full bg-perra-gold hover:bg-perra-gold/90 text-white font-semibold" disabled={loading}>
              {loading ? (mode === 'signin' ? 'Signing In...' : 'Signing Up...') : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
            </Button>
          </Form>
          <div className="mt-4 text-center">
            {mode === 'signin' ? (
              <span>
                Don't have an account?{' '}
                <button type="button" className="text-perra-gold hover:underline font-medium" onClick={() => setMode('signup')}>
                  Sign Up
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button type="button" className="text-perra-gold hover:underline font-medium" onClick={() => setMode('signin')}>
                  Sign In
                </button>
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
