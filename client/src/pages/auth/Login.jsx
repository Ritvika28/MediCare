import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Stethoscope } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { getApiErrorMessage } from '@/api/axios';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password required'),
});

const DEMO_ACCOUNTS = [
  { role: 'Patient', email: 'patient@hospital.com', password: 'Patient123!' },
  { role: 'Doctor', email: 'dr.smith@hospital.com', password: 'Doctor123!' },
  { role: 'Admin', email: 'admin@hospital.com', password: 'Admin123!@#' },
];

export default function Login() {
  const { login } = useAuth();
  const toastContext = useToast();
  const toast = toastContext?.toast ?? ((msg) => console.error(msg));
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const user = await login(data.email, data.password);
      toast('Welcome back!', 'success');
      navigate(`/${user.role}`, { replace: true });
    } catch (err) {
      toast(getApiErrorMessage(err, 'Login failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (account) => {
    setValue('email', account.email);
    setValue('password', account.password);
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Stethoscope className="mx-auto h-10 w-10 text-teal-600" />
          <CardTitle className="mt-2">Welcome Back</CardTitle>
          <CardDescription>Sign in to your MediCare account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Input placeholder="Email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div>
              <Input placeholder="Password" type="password" autoComplete="current-password" {...register('password')} />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>
            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-teal-600 hover:underline">Forgot password?</Link>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
            <p className="mb-2 text-xs font-medium text-slate-500">Demo accounts (click to fill)</p>
            <div className="flex flex-col gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-teal-950"
                >
                  <span className="font-medium text-teal-700 dark:text-teal-400">{acc.role}</span>
                  <span className="block text-slate-500">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-slate-500">
            Don't have an account? <Link to="/signup" className="text-teal-600 hover:underline">Sign up</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
