import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function Contact() {
  const { register, handleSubmit } = useForm();
  const { toast } = useToast();

  const onSubmit = () => toast('Message sent! We will get back to you soon.', 'success');

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-bold">Contact Us</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          {[{ icon: Mail, text: 'info@medicare.in' }, { icon: Phone, text: '+91-1800-103-0103' }, { icon: MapPin, text: 'MediCare Health Network, India' }].map((item) => (
            <div key={item.text} className="flex items-center gap-3 text-slate-600">
              <item.icon className="h-5 w-5 text-teal-600" />
              {item.text}
            </div>
          ))}
        </div>
        <Card>
          <CardHeader><CardTitle>Send a Message</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input placeholder="Name" {...register('name', { required: true })} />
              <Input type="email" placeholder="Email" {...register('email', { required: true })} />
              <textarea className="flex min-h-[120px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Message" {...register('message')} />
              <Button type="submit" className="w-full">Send Message</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
