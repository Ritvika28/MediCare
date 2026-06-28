import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/api/axios';
import { ReviewCard } from '@/components/ReviewCard';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import {
  Star, Clock, ShieldCheck, Languages, Award, MapPin, Phone, Mail,
  MessageSquare, AlertCircle, HeartPulse, Navigation, Building2, FlaskConical,
  ExternalLink,
} from 'lucide-react';
import { useState } from 'react';

export default function DoctorProfile() {
  const { hospitalId, doctorId } = useParams();
  const queryClient = useQueryClient();
  const { latitude, longitude } = useCurrentLocation();

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: () => api.get(`/doctors/${doctorId}`).then((r) => r.data),
  });

  const hospital = response?.data?.doctor?.hospital || response?.data?.doctor?.hospitalId;
  const hId = hospitalId || hospital?._id || hospital;

  const { data: nearbyLabs } = useQuery({
    queryKey: ['doctor-nearby-labs', latitude, longitude],
    queryFn: () => api.get('/labs', { params: { lat: latitude, lng: longitude, radius: 15, limit: 5 } }).then((r) => r.data),
    enabled: typeof latitude === 'number' && typeof longitude === 'number',
  });

  const { data: nearbyHospitals } = useQuery({
    queryKey: ['doctor-nearby-hospitals', latitude, longitude],
    queryFn: () => api.get('/hospitals/nearby', { params: { latitude, longitude, maxDistance: 15000, limit: 5 } }).then((r) => r.data),
    enabled: typeof latitude === 'number' && typeof longitude === 'number',
  });

  const doctor = response?.data?.doctor;
  const reviews = response?.data?.reviews || [];

  const addReviewMutation = useMutation({
    mutationFn: (newReview) => api.post('/reviews', newReview),
    onSuccess: () => {
      setReviewSuccess(true);
      setReviewComment('');
      setReviewRating(5);
      queryClient.invalidateQueries({ queryKey: ['doctor', doctorId] });
    },
    onError: (err) => setReviewError(err.response?.data?.message || 'Error submitting review'),
  });

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (isError || !doctor) return <div className="text-center py-12"><p className="text-slate-500">Doctor Profile Not Found</p></div>;

  const user = doctor.user;
  const hospitalData = typeof hospital === 'object' ? hospital : null;
  const qualifications = doctor.qualification || doctor.education?.map((e) => `${e.degree} (${e.institution})`).join(', ') || 'MBBS, MD';
  const address = hospitalData?.address;
  const fullAddress = [address?.street, address?.city, address?.state, address?.pincode].filter(Boolean).join(', ');
  const mapsUrl = fullAddress
    ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(fullAddress)}`
    : address?.city ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${hospitalData?.name} ${address.city}`)}` : null;

  return (
    <div className="space-y-6">
      <Link to={hId ? `/patient/hospitals/${hId}` : '/doctors'}>
        <Button variant="ghost" size="sm" className="mb-2">← Back</Button>
      </Link>

      <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-700 p-6 md:p-8 text-white relative overflow-hidden shadow-lg">
        <div className="flex flex-col md:flex-row gap-6 items-center relative z-10">
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="h-28 w-28 rounded-full object-cover border-4 border-white/20" />
          ) : (
            <div className="h-28 w-28 rounded-full bg-white/10 text-3xl font-extrabold flex items-center justify-center border-4 border-white/20">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          )}
          <div className="text-center md:text-left flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h1 className="text-3xl font-extrabold">Dr. {user?.firstName} {user?.lastName}</h1>
              {doctor.isVerified && <Badge className="bg-white/20 text-white"><ShieldCheck className="h-3.5 w-3.5" /> Verified</Badge>}
            </div>
            <p className="text-teal-100 font-semibold uppercase text-sm">{doctor.specialization}</p>
            <p className="text-teal-50/80 text-sm">{qualifications}</p>
            <div className="flex flex-wrap gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1"><Award className="h-4 w-4" /> {doctor.experience || 0} Yrs</span>
              <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400" /> {doctor.rating?.toFixed(1) || '—'} ({doctor.reviewCount || 0} reviews)</span>
              <span className="flex items-center gap-1"><Languages className="h-4 w-4" /> {(doctor.languages || ['English', 'Hindi']).join(', ')}</span>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center min-w-[150px] border border-white/10">
            <span className="text-[10px] font-bold block uppercase">Consultation Fee</span>
            <span className="text-3xl font-black">₹{doctor.consultationFee || 500}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Biography</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {doctor.bio || `Dr. ${user?.firstName} ${user?.lastName} is a ${doctor.specialization} specialist with ${doctor.experience || 0} years of experience.`}
              </p>
            </CardContent>
          </Card>

          {hospitalData && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Hospital & Contact</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{hospitalData.name}</p>
                  {fullAddress && <p className="text-sm text-slate-500 mt-1 flex items-start gap-2"><MapPin className="h-4 w-4 shrink-0 mt-0.5" />{fullAddress}</p>}
                </div>
                <div className="flex flex-wrap gap-3">
                  {hospitalData.phone && (
                    <a href={`tel:${hospitalData.phone}`} className="inline-flex items-center gap-2 text-sm font-bold text-teal-600 hover:underline">
                      <Phone className="h-4 w-4" /> {hospitalData.phone}
                    </a>
                  )}
                  {user?.phone && (
                    <span className="inline-flex items-center gap-2 text-sm text-slate-600"><Phone className="h-4 w-4" /> Clinic: {user.phone}</span>
                  )}
                  {user?.email && (
                    <a href={`mailto:${user.email}`} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:underline"><Mail className="h-4 w-4" /> {user.email}</a>
                  )}
                </div>
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="gap-2 font-bold text-xs"><Navigation className="h-4 w-4" /> Get Directions <ExternalLink className="h-3 w-3" /></Button>
                  </a>
                )}
                <Link to={`/patient/hospitals/${hId}`}>
                  <Button className="bg-teal-600 hover:bg-teal-700 text-white font-bold">View Hospital Profile</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {(nearbyLabs?.data?.length > 0 || nearbyHospitals?.data?.length > 0) && (
            <div className="grid gap-4 md:grid-cols-2">
              {nearbyLabs?.data?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FlaskConical className="h-4 w-4" /> Nearby Labs</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {nearbyLabs.data.slice(0, 4).map((lab) => (
                      <p key={lab._id} className="text-xs font-semibold text-slate-600">{lab.name} — {lab.address?.city}</p>
                    ))}
                    <Link to="/patient/nearby-labs" className="text-xs font-bold text-teal-600 hover:underline">View all labs</Link>
                  </CardContent>
                </Card>
              )}
              {nearbyHospitals?.data?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><HeartPulse className="h-4 w-4" /> Nearby Hospitals</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {nearbyHospitals.data.slice(0, 4).map((h) => (
                      <p key={h._id} className="text-xs font-semibold text-slate-600">{h.name} {h.distance != null ? `(${h.distance} km)` : ''}</p>
                    ))}
                    <Link to="/patient/hospitals" className="text-xs font-bold text-teal-600 hover:underline">Find hospitals</Link>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-amber-500" /> Reviews</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-h-[300px] overflow-y-auto">
              {reviews.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">No reviews yet</p> : reviews.map((r) => <ReviewCard key={r._id} review={r} />)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Write a Review</CardTitle></CardHeader>
            <CardContent>
              {reviewSuccess ? (
                <p className="text-sm font-bold text-emerald-600 text-center py-4">Review submitted!</p>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); if (reviewComment.trim()) addReviewMutation.mutate({ doctorId, rating: reviewRating, comment: reviewComment }); }} className="space-y-4">
                  {reviewError && <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle className="h-4 w-4" />{reviewError}</p>}
                  <div className="flex gap-1">{[1,2,3,4,5].map((s) => <button key={s} type="button" onClick={() => setReviewRating(s)}><Star className={`h-6 w-6 ${s <= reviewRating ? 'fill-amber-500 stroke-amber-500' : 'stroke-slate-300'}`} /></button>)}</div>
                  <textarea rows={3} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Share your experience..." className="w-full text-xs rounded-lg border p-2.5 dark:bg-slate-900 dark:border-slate-800" />
                  <Button type="submit" disabled={addReviewMutation.isPending} className="w-full bg-teal-600 text-white font-bold text-xs">Submit</Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="border-rose-200 dark:border-rose-900/50">
            <CardContent className="p-4 text-center space-y-2">
              <p className="text-xs font-bold text-slate-500">Medical Emergency?</p>
              <Link to="/patient/emergency-hub"><Button variant="outline" className="w-full text-rose-600 border-rose-300 font-bold text-xs">Emergency SOS</Button></Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
