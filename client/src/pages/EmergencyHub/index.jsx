import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Phone, HeartPulse, AlertTriangle, Clock, MapPin, CheckCircle, ChevronRight, Activity, Info, ShieldAlert
} from 'lucide-react';

const HELPLINES = [
  { name: 'National Emergency', number: '112', desc: 'Single number for all emergency services', icon: ShieldAlert, color: 'from-rose-650 to-red-700' },
  { name: 'Ambulance Support', number: '102', desc: 'Direct access to public medical responders', icon: HeartPulse, color: 'from-red-600 to-rose-600' },
  { name: 'Poison Control Helpline', number: '1800-116-117', desc: 'Toxicology & ingestion assistance', icon: AlertTriangle, color: 'from-amber-600 to-orange-650' },
  { name: 'Police Helpline', number: '100', desc: 'Law enforcement & security dispatchers', icon: ShieldAlert, color: 'from-blue-600 to-indigo-650' },
];

const FIRST_AID_GUIDES = [
  {
    id: 'cpr',
    title: '❤️ Cardiopulmonary Resuscitation (CPR)',
    desc: 'For unresponsive individuals who are not breathing normally.',
    steps: [
      'Check safety: Verify the surrounding environment is safe before entering.',
      'Check response: Tap the shoulders and ask loudly, "Are you okay?"',
      'Call for help: Call 112 immediately and get an AED if available.',
      'Check breathing: Look at the chest for up to 10 seconds for breathing.',
      'Start chest compressions: Place hands on center of chest, push hard and fast (100-120/min, 2-2.4 inches deep).',
      'Provide rescue breaths: (If trained) Give 2 breaths after every 30 compressions. Repeat until help arrives.'
    ]
  },
  {
    id: 'choking',
    title: '🫁 Choking Relief (Heimlich Maneuver)',
    desc: 'For individuals unable to speak or breathe due to airway obstruction.',
    steps: [
      'Assess severity: Ask "Are you choking?" If they can speak or cough, encourage coughing.',
      'Give back blows: Stand behind them, lean them forward, and deliver 5 sharp blows between shoulder blades.',
      'Give abdominal thrusts: Wrap arms around waist, make a fist above navel, grasp with other hand, pull inward and upward 5 times.',
      'Alternate cycles: Alternate 5 back blows and 5 abdominal thrusts.',
      'Unconscious care: If they lose consciousness, lower to ground and begin CPR.'
    ]
  },
  {
    id: 'bleeding',
    title: '🩸 Severe Bleeding Control',
    desc: 'To prevent hemorrhagic shock from significant cuts or trauma.',
    steps: [
      'Apply direct pressure: Use a sterile bandage or clean cloth and push firmly directly on the wound.',
      'Elevate the injury: If possible, raise the wounded limb above heart level to slow blood flow.',
      'Keep pressure steady: Maintain firm pressure. Do not remove the cloth if it gets soaked — add another layer.',
      'Apply tourniquet: (If severe/uncontrolled limb bleeding) Apply 2-3 inches above the wound (never on a joint).',
      'Keep patient warm: Cover them to regulate body temperature and prevent shock.'
    ]
  },
  {
    id: 'burns',
    title: '🔥 Thermal & Chemical Burns',
    desc: 'First-response instructions for heat-induced or chemical injuries.',
    steps: [
      'Cool the burn: Cool under cool (not freezing) running tap water for 10-20 minutes.',
      'Remove jewelry/constrictive items: Do this gently before swelling starts.',
      'Protect the area: Cover loosely with a clean, non-stick sterile bandage or plastic wrap.',
      'Do NOT pop blisters: Popping blisters increases risk of infection.',
      'Seek professional care: For large burns, face, hands, feet, or chemical contact, seek immediate medical attention.'
    ]
  }
];

export default function EmergencyHub() {
  const queryClient = useQueryClient();
  const [selectedGuide, setSelectedGuide] = useState('cpr');

  // Query SOS request history
  const { data: requestsRes, isLoading } = useQuery({
    queryKey: ['emergency-requests'],
    queryFn: () => api.get('/emergency/requests').then(r => r.data),
  });

  const requests = requestsRes?.data || [];

  return (
    <div className="space-y-6">
      {/* Critical Alert Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-red-700 via-rose-650 to-orange-600 p-6 md:p-8 text-white overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 opacity-10">
          <AlertTriangle className="h-80 w-80 animate-pulse" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-rose-100 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-200" /> Crisis Response Panel
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Emergency Resource Hub</h1>
          <p className="text-rose-100/90 text-sm md:text-base leading-relaxed font-medium">
            Access immediate dial lines, follow certified step-by-step first aid guides, or check active ambulance SOS dispatch requests.
          </p>
        </div>
      </div>

      {/* Helplines grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {HELPLINES.map((line, i) => (
          <Card key={i} className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition">
            <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
              <div className="flex gap-3 items-start">
                <div className={`p-2.5 rounded-xl text-white bg-gradient-to-br ${line.color} shrink-0`}>
                  <line.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">{line.name}</h3>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5 leading-snug">{line.desc}</p>
                </div>
              </div>
              <a href={`tel:${line.number}`} className="block">
                <Button className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:bg-rose-50 text-rose-650 rounded-xl text-xs font-black gap-1.5 py-2.5">
                  <Phone className="h-3.5 w-3.5 fill-current" /> Call {line.number}
                </Button>
              </a>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Requests and First Aid split */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Step-by-step guides */}
        <Card className="lg:col-span-2 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardHeader className="pb-3 border-b dark:border-slate-800/85">
            <CardTitle className="text-base flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-red-650" /> CPR & First Aid Protocol Guides
            </CardTitle>
            <CardDescription>Follow step-by-step instructions in real-time until paramedics arrive.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 space-y-5">
            {/* Guide selection list tabs */}
            <div className="flex flex-wrap gap-2">
              {FIRST_AID_GUIDES.map(guide => (
                <button
                  key={guide.id}
                  onClick={() => setSelectedGuide(guide.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                    selectedGuide === guide.id
                      ? 'bg-rose-600 text-white border-rose-650'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-150 dark:border-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {guide.title.split(' ')[0]} {guide.title.split(' ').slice(1).join(' ')}
                </button>
              ))}
            </div>

            {/* Active Guide Steps */}
            {(() => {
              const guide = FIRST_AID_GUIDES.find(g => g.id === selectedGuide);
              return (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850">
                    <p className="text-sm font-black text-slate-800 dark:text-white">{guide.title}</p>
                    <p className="text-xs text-slate-450 mt-1 font-semibold">{guide.desc}</p>
                  </div>

                  <div className="space-y-3">
                    {guide.steps.map((step, index) => (
                      <div key={index} className="flex gap-3 items-start text-xs font-medium">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-50 text-rose-650 dark:bg-rose-950/30 text-[10px] font-black shrink-0 border border-rose-150 dark:border-rose-900">
                          {index + 1}
                        </div>
                        <p className="text-slate-705 dark:text-slate-350 leading-relaxed mt-0.5">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* SOS Request status tracking panel */}
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-400" /> SOS Request Tracking
            </CardTitle>
            <CardDescription>Monitor status of emergency dispatch requests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center p-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-650 border-t-transparent"></div>
              </div>
            ) : requests.length > 0 ? (
              requests.slice(0, 5).map(req => {
                const statusColors = {
                  pending: 'bg-amber-50 text-amber-600 border-amber-100',
                  dispatched: 'bg-indigo-50 text-indigo-600 border-indigo-100',
                  in_transit: 'bg-blue-50 text-blue-600 border-blue-100',
                  arrived: 'bg-teal-50 text-teal-600 border-teal-100',
                  resolved: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                  cancelled: 'bg-slate-100 text-slate-500 border-slate-200'
                };

                return (
                  <div key={req._id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                    <div className="flex justify-between items-center">
                      <Badge className="text-[9px] uppercase font-bold border-0 bg-red-50 text-red-600">
                        {req.type === 'ambulance' ? '🚑 Ambulance' : '🚨 Alert'}
                      </Badge>
                      <Badge className={`text-[9px] uppercase font-bold border ${statusColors[req.status] || ''}`}>
                        {req.status}
                      </Badge>
                    </div>

                    {req.hospital && (
                      <p className="text-[10px] text-slate-400 font-semibold truncate">
                        Hospital: {req.hospital.name}
                      </p>
                    )}

                    {req.description && (
                      <p className="text-xs text-slate-655 dark:text-slate-350 leading-relaxed italic">
                        "{req.description}"
                      </p>
                    )}

                    <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span>{new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      {req.location?.coordinates?.length === 2 && (
                        <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> Coordinates</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center p-6 text-slate-400 space-y-2">
                <Info className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold">No SOS Dispatches</p>
                <p className="text-[10px] text-slate-450 leading-relaxed">
                  Any emergency ambulance dispatch or emergency notifications will be tracked here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
