import { Card, CardContent } from '@/components/ui/Card';

export default function About() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-bold">About MediCare</h1>
      <p className="mt-4 text-slate-600 dark:text-slate-400">
        MediCare is an enterprise-grade hospital management platform designed to streamline healthcare delivery for patients, doctors, and administrators.
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card><CardContent className="p-6"><h3 className="font-semibold">Our Mission</h3><p className="mt-2 text-sm text-slate-500">To make quality healthcare accessible through technology.</p></CardContent></Card>
        <Card><CardContent className="p-6"><h3 className="font-semibold">Our Vision</h3><p className="mt-2 text-sm text-slate-500">A world where managing health is as simple as managing your calendar.</p></CardContent></Card>
      </div>
    </div>
  );
}
