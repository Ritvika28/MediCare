import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import {
  ArrowRight, Shield, Bot, MapPin, HeartPulse, Activity,
  Pill, FileText, Droplet, Calculator, Star, CheckCircle2,
  Zap, Lock, Clock, Users
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

/* ─── animation helpers ─────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

function InViewSection({ children, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── animated counter ──────────────────────────────────────── */
function Counter({ target, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ─── data ──────────────────────────────────────────────────── */
const features = [
  {
    icon: HeartPulse,
    title: 'Smart Vitals Tracking',
    desc: 'Log blood pressure, sugar, BMI, sleep, and more. Your health data compiles into a smart twin profile.',
    color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/30',
  },
  {
    icon: Bot,
    title: 'AI Health Assistant',
    desc: 'Ask health questions 24/7 to an AI trained on clinical knowledge. Get personalised guidance instantly.',
    color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30',
  },
  {
    icon: Shield,
    title: 'Encrypted Medical Records',
    desc: 'Upload, store, and access prescriptions and lab reports securely from anywhere — always yours.',
    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30',
  },
  {
    icon: MapPin,
    title: 'Nearby Healthcare Finder',
    desc: 'Locate hospitals, clinics, labs, and blood banks near you with real-time availability data.',
    color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/30',
  },
  {
    icon: Calculator,
    title: '15+ Health Calculators',
    desc: 'BMI, kidney, liver, cholesterol, PCOS risk, diabetes predictor — built by medical algorithms.',
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
  },
  {
    icon: Pill,
    title: 'Medicine Reminder',
    desc: 'Never miss a dose. Set smart medication schedules with taken-status tracking per day.',
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30',
  },
  {
    icon: Activity,
    title: 'Predictive Risk Assessment',
    desc: 'Get risk predictions for heart disease, diabetes, kidney failure, and more based on your vitals.',
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
  },
  {
    icon: Droplet,
    title: 'Emergency Blood Bank',
    desc: 'Find the nearest blood donation centres and check live availability in critical situations.',
    color: 'text-red-600 bg-red-50 dark:bg-red-950/30',
  },
];

const stats = [
  { label: 'Registered Patients', value: 12000, suffix: '+' },
  { label: 'Health Assessments', value: 85000, suffix: '+' },
  { label: 'Partner Hospitals', value: 340, suffix: '+' },
  { label: 'Uptime Reliability', value: 99, suffix: '%' },
];

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'Diabetic Patient, Bengaluru',
    quote: "MediCare's sugar tracker and AI assistant helped me manage my HbA1c levels better than ever. The risk predictor flagged kidney stress early — I caught it in time.",
    rating: 5,
    initials: 'PS',
    color: 'from-teal-400 to-emerald-500',
  },
  {
    name: 'Arjun Mehta',
    role: 'Cardiac Patient, Mumbai',
    quote: 'The heart health calculator and medicine reminder have genuinely changed how I manage my recovery. Everything in one place, no more juggling 5 apps.',
    rating: 5,
    initials: 'AM',
    color: 'from-indigo-400 to-blue-500',
  },
  {
    name: 'Kavitha Reddy',
    role: 'New Mother, Hyderabad',
    quote: "Uploading baby's vaccination records and setting reminders is so simple. The AI answered all my post-partum questions at 2 AM when no doctor was available.",
    rating: 5,
    initials: 'KR',
    color: 'from-rose-400 to-pink-500',
  },
];

const trustBadges = [
  { icon: Lock, label: 'HIPAA-Compliant Storage' },
  { icon: Zap, label: 'Real-Time Data Sync' },
  { icon: Clock, label: '24 / 7 AI Availability' },
  { icon: Users, label: 'Patient-First Design' },
];

/* ─── component ─────────────────────────────────────────────── */
export default function Home() {
  return (
    <div className="overflow-x-hidden">

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 px-4 py-28">
        {/* background blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/5 blur-2xl" />
        </div>
        {/* animated grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/25 bg-teal-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-teal-400 mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
              AI-Powered Patient Health Platform
            </div>

            <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.05]">
              Your Complete{' '}
              <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                Health Passport
              </span>
              <br />in One Place
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-lg text-slate-400 leading-relaxed">
              Track vitals, store medical records, get AI-powered health guidance, find nearby hospitals and labs, and manage medications — all from a single secure platform built for patients.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link to="/signup">
                <Button size="lg" className="bg-teal-500 hover:bg-teal-600 text-white font-black px-8 py-3.5 rounded-2xl shadow-lg shadow-teal-500/25 text-base transition-all hover:shadow-teal-500/40 hover:-translate-y-0.5">
                  Start for Free <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white font-bold px-8 py-3.5 rounded-2xl text-base transition-all hover:-translate-y-0.5">
                  Sign In to Dashboard
                </Button>
              </Link>
            </div>

            <p className="mt-5 text-xs text-slate-600 font-semibold">
              No credit card required · Free for patients · Trusted by 12,000+ users
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── TRUST BADGES ──────────────────────────────────────── */}
      <InViewSection className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 py-7">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {trustBadges.map((b, i) => (
              <motion.div
                key={b.label}
                variants={fadeUp}
                custom={i}
                className="flex items-center gap-3 justify-center md:justify-start"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
                  <b.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{b.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </InViewSection>

      {/* ── STATS COUNTER ─────────────────────────────────────── */}
      <InViewSection className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 py-20 px-4">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div key={s.label} variants={fadeUp} custom={i} className="text-center">
                <p className="text-4xl font-black text-white md:text-5xl">
                  <Counter target={s.value} suffix={s.suffix} />
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-400">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </InViewSection>

      {/* ── FEATURES GRID ─────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-24">
        <InViewSection>
          <motion.div variants={fadeUp} className="mb-16 text-center max-w-2xl mx-auto">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-3">Platform Features</span>
            <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Everything you need to manage your health
            </h2>
            <p className="mt-4 text-slate-500 dark:text-slate-400">
              MediCare is purpose-built for patients — not hospitals, not doctors. It's your personal healthcare command centre.
            </p>
          </motion.div>
        </InViewSection>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <InViewSection key={f.title}>
              <motion.div
                variants={fadeUp}
                custom={i % 4}
                className="group relative flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-900/60 duration-200"
              >
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${f.color} shrink-0`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm">{f.title}</h3>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            </InViewSection>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section className="bg-slate-50 dark:bg-slate-900/50 py-24 px-4">
        <div className="mx-auto max-w-5xl">
          <InViewSection>
            <motion.div variants={fadeUp} className="mb-16 text-center">
              <span className="inline-block text-xs font-black uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-3">Quick Start</span>
              <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Get started in 3 steps</h2>
            </motion.div>
          </InViewSection>

          <div className="relative grid gap-10 md:grid-cols-3">
            {/* connecting line */}
            <div className="absolute top-6 left-1/4 right-1/4 hidden h-0.5 bg-gradient-to-r from-teal-200 via-teal-400 to-teal-200 dark:from-slate-700 dark:via-teal-600 dark:to-slate-700 md:block" />

            {[
              { step: '01', title: 'Create your account', desc: 'Sign up in 30 seconds — no credit card needed. Your data is encrypted from day one.' },
              { step: '02', title: 'Build your health profile', desc: 'Log vitals, upload records, and run health calculators to populate your personal health passport.' },
              { step: '03', title: 'Track & get insights', desc: 'MediCare analyses your data, predicts risks, and provides personalised daily health guidance.' },
            ].map((s, i) => (
              <InViewSection key={s.step}>
                <motion.div variants={fadeUp} custom={i} className="flex flex-col items-center text-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-black text-xl shadow-lg shadow-teal-500/25">
                    {s.step}
                  </div>
                  <h3 className="font-black text-slate-900 dark:text-white">{s.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">{s.desc}</p>
                </motion.div>
              </InViewSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-24">
        <InViewSection>
          <motion.div variants={fadeUp} className="mb-16 text-center">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-3">Patient Stories</span>
            <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Trusted by real patients</h2>
            <div className="flex items-center justify-center gap-1 mt-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
              ))}
              <span className="ml-2 text-sm font-bold text-slate-500">4.9 / 5 average from 2,400+ reviews</span>
            </div>
          </motion.div>
        </InViewSection>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <InViewSection key={t.name}>
              <motion.div
                variants={fadeUp}
                custom={i}
                className="flex flex-col gap-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 hover:shadow-md transition-shadow"
              >
                <div className="flex gap-1">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 mt-auto pt-2 border-t dark:border-slate-800">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-white text-xs font-black shadow`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200">{t.name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            </InViewSection>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="px-4 py-24">
        <InViewSection>
          <motion.div
            variants={fadeUp}
            className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 p-10 md:p-16 text-center shadow-2xl border border-slate-800"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-0 left-0 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl translate-x-1/2 translate-y-1/2" />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="flex flex-wrap gap-3 justify-center">
                {['No credit card', 'Free for patients', 'Instant setup'].map((badge) => (
                  <span key={badge} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-teal-300 border border-teal-500/20">
                    <CheckCircle2 className="h-3 w-3" /> {badge}
                  </span>
                ))}
              </div>
              <h2 className="text-3xl font-black text-white md:text-4xl">
                Take control of your health today
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto leading-relaxed">
                Join 12,000+ patients who use MediCare to track their vitals, manage medications, find nearby care, and get AI-powered health guidance — all for free.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link to="/signup">
                  <Button size="lg" className="bg-teal-500 hover:bg-teal-600 text-white font-black px-8 py-3.5 rounded-2xl shadow-lg shadow-teal-500/30 text-base transition-all hover:-translate-y-0.5">
                    Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 font-bold px-8 py-3.5 rounded-2xl text-base transition-all hover:-translate-y-0.5">
                    Already have an account?
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </InViewSection>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-10">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400 font-semibold">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-teal-600" />
            <span className="font-black text-slate-700 dark:text-slate-300">MediCare</span>
            <span className="text-xs">— Your Personal Health Passport</span>
          </div>
          <div className="flex gap-6">
            <Link to="/about" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">About</Link>
            <Link to="/contact" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Contact</Link>
            <Link to="/signup" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Sign Up</Link>
            <Link to="/login" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Login</Link>
          </div>
          <p>© {new Date().getFullYear()} MediCare. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
