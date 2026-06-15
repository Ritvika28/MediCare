import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Shield, Bot, MapPin, Heart } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

const features = [
  { icon: Calendar, title: 'Health Tracking', desc: 'Track vitals, calculators, and clinical history in one place.' },
  { icon: Shield, title: 'Secure Records', desc: 'Your medical records are encrypted and always accessible.' },
  { icon: Bot, title: 'AI Health Assistant', desc: 'Get instant answers to health questions 24/7.' },
  { icon: MapPin, title: 'Hospital Locator', desc: 'Find nearby hospitals and emergency services.' },
];

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-white to-cyan-50 px-4 py-24 dark:from-slate-900 dark:via-slate-950 dark:to-teal-950 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <span className="mb-4 inline-block rounded-full bg-teal-100 px-4 py-1 text-sm font-medium text-teal-700 dark:bg-teal-900 dark:text-teal-300">
              AI-Powered Healthcare Platform
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-6xl">
              Modern Healthcare, <span className="text-teal-600">Simplified</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 dark:text-slate-400">
              Manage appointments, access medical records, connect with doctors, and get AI-powered health guidance — all in one platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/signup"><Button size="lg">Get Started <ArrowRight className="h-4 w-4" /></Button></Link>
              <Link to="/login"><Button size="lg" variant="outline">Find Nearby Hospitals</Button></Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">Why Choose MediCare?</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex rounded-xl bg-teal-50 p-3 text-teal-600 dark:bg-teal-950">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-slate-500">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-teal-600 px-4 py-16 text-center text-white">
        <Heart className="mx-auto mb-4 h-10 w-10" />
        <h2 className="text-2xl font-bold">Your Health, Our Priority</h2>
        <p className="mx-auto mt-2 max-w-xl text-teal-100">Join thousands of patients who trust MediCare for their healthcare needs.</p>
        <Link to="/signup" className="mt-6 inline-block">
          <Button size="lg" variant="secondary">Create Free Account</Button>
        </Link>
      </section>
    </div>
  );
}
