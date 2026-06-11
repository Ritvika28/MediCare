import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/axios';
import { SlotSelector } from '@/components/SlotSelector';
import { ReviewCard } from '@/components/ReviewCard';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  Star, Clock, ShieldCheck, Languages, Award, Video, 
  MapPin, Phone, MessageSquare, AlertCircle, HeartPulse, UserPlus
} from 'lucide-react';

export default function DoctorProfile() {
  const { hospitalId, doctorId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [consultType, setConsultType] = useState('physical');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Fetch Doctor details (including populated reviews)
  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: () => api.get(`/doctors/${doctorId}`).then((r) => r.data),
  });

  const doctor = response?.data?.doctor;
  const reviews = response?.data?.reviews || [];

  const handleBook = () => {
    if (!selectedSlot) return;
    
    // Redirect to final booking page with queries
    navigate(
      `/patient/book/${doctorId}?hospitalId=${hospitalId}&type=${consultType}&date=${selectedSlot.date.toISOString()}&time=${selectedSlot.time}`
    );
  };

  // Submit Review Mutation
  const addReviewMutation = useMutation({
    mutationFn: (newReview) => api.post('/reviews', newReview),
    onSuccess: () => {
      setReviewSuccess(true);
      setReviewComment('');
      setReviewRating(5);
      setReviewError('');
      queryClient.invalidateQueries(['doctor', doctorId]);
    },
    onError: (err) => {
      setReviewError(err.response?.data?.message || 'Error submitting review');
    }
  });

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    setReviewSuccess(false);
    setReviewError('');

    if (!reviewComment.trim()) {
      setReviewError('Review comment cannot be empty.');
      return;
    }

    addReviewMutation.mutate({
      doctorId,
      rating: reviewRating,
      comment: reviewComment,
    });
  };

  if (isLoading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (isError || !doctor) return <div className="text-center py-12"><p className="text-slate-500">Doctor Profile Not Found</p></div>;

  const user = doctor.user;
  const qualifications = doctor.education?.map((edu) => `${edu.degree} (${edu.institution}, ${edu.year})`).join(', ') || 'MBBS, MD';
  const wait = doctor.waitingTime || (doctor.currentQueue || 0) * (doctor.averageConsultationTime || 30);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link to={`/patient/hospitals/${hospitalId}`}>
        <Button variant="ghost" size="sm" className="mb-2">← Back to Hospital</Button>
      </Link>

      {/* Profile Header */}
      <div className="rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-700 p-6 md:p-8 text-white relative overflow-hidden shadow-lg">
        <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 opacity-10">
          <HeartPulse className="h-64 w-64" />
        </div>
        <div className="flex flex-col md:flex-row gap-6 items-center relative z-10">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.fullName}
              className="h-28 w-28 rounded-full object-cover border-4 border-white/20 shadow-md"
            />
          ) : (
            <div className="h-28 w-28 rounded-full bg-white/10 text-white text-3xl font-extrabold flex items-center justify-center border-4 border-white/20">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          )}

          <div className="text-center md:text-left flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h1 className="text-3xl font-extrabold">Dr. {user?.firstName} {user?.lastName}</h1>
              {doctor.isVerified && (
                <Badge className="bg-white/20 text-white flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified
                </Badge>
              )}
            </div>
            
            <p className="text-teal-100 font-semibold tracking-wide uppercase text-sm">{doctor.specialization}</p>
            <p className="text-teal-50/80 text-xs md:text-sm font-medium">{qualifications}</p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-semibold pt-1">
              <span className="flex items-center gap-1.5"><Award className="h-4 w-4" /> {doctor.experience} Yrs Experience</span>
              <span className="flex items-center gap-1.5"><Languages className="h-4 w-4" /> {(doctor.languages || ['English', 'Hindi']).join(', ')}</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center min-w-[150px] border border-white/10 shadow-sm shrink-0">
            <span className="text-[10px] text-teal-100 font-bold block uppercase tracking-wider">CONSULTATION FEE</span>
            <span className="text-3xl font-black block mt-1">₹{doctor.consultationFee || 500}</span>
            <span className="text-[10px] text-teal-100/90 font-medium block mt-1">Pay at clinic or online</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Columns - Bio, Queue & Booking */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bio & Clinic Info */}
          <Card className="border border-slate-100 dark:border-slate-800">
            <CardHeader><CardTitle className="text-lg">Biography & Specialty</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {doctor.bio || `Dr. ${user?.firstName} ${user?.lastName} is a highly accomplished ${doctor.specialization} specialist committed to delivering exceptional patient-centric care. Providing services at MediCare partner centers, using advanced diagnostic resources.`}
              </p>
              
              {/* Queue Status Prediction */}
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 grid grid-cols-2 sm:grid-cols-3 gap-4 items-center">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-teal-100 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">CURRENT QUEUE</span>
                    <span className="text-sm font-bold">{doctor.currentQueue || 0} Patients</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">EST. WAITING TIME</span>
                    <span className="text-sm font-bold">~{wait || 15} Mins</span>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 text-xs text-slate-400 dark:text-slate-500 font-medium">
                  Queue updates in real-time on consult days.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Slots Selector */}
          <Card className="border border-slate-100 dark:border-slate-800">
            <CardHeader><CardTitle className="text-lg">Schedule Consultation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Consultation Type Radio Grid */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Select Consultation Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { value: 'physical', label: 'In-Clinic Visit', icon: MapPin },
                    { value: 'video', label: 'Video Call', icon: Video },
                    { value: 'audio', label: 'Audio Call', icon: Phone },
                    { value: 'chat', label: 'Chat Consult', icon: MessageSquare },
                  ].map((mode) => {
                    const isSelected = consultType === mode.value;
                    const isSupported = doctor.consultationModes?.includes(mode.value) || mode.value === 'physical';
                    
                    return (
                      <button
                        key={mode.value}
                        type="button"
                        disabled={!isSupported}
                        onClick={() => setConsultType(mode.value)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                          isSelected
                            ? 'bg-teal-50 border-teal-500 text-teal-700 dark:bg-teal-950/20 dark:border-teal-700 dark:text-teal-400'
                            : isSupported
                            ? 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                            : 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <mode.icon className={`h-5 w-5 mb-1.5 ${isSelected ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold">{mode.label}</span>
                        {!isSupported && <span className="text-[8px] uppercase mt-0.5 text-slate-400">Unsupported</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slots select component */}
              <SlotSelector
                doctorId={doctorId}
                onSelectSlot={setSelectedSlot}
                selectedSlot={selectedSlot}
              />

              {/* Confirm Booking CTA */}
              <div className="pt-4 border-t dark:border-slate-800/80 flex items-center justify-between gap-4">
                {selectedSlot ? (
                  <p className="text-xs text-slate-500 font-semibold">
                    Selected: <span className="text-teal-600 font-bold">{selectedSlot.time}</span> on{' '}
                    <span className="text-teal-600 font-bold">
                      {selectedSlot.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">Please select a date and slot above to book.</p>
                )}
                
                <Button
                  onClick={handleBook}
                  disabled={!selectedSlot}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 shadow-md"
                >
                  Confirm Appointment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Reviews & Submit Review Form */}
        <div className="space-y-6">
          {/* Patients Reviews */}
          <Card className="border border-slate-100 dark:border-slate-800">
            <CardHeader className="border-b pb-3 dark:border-slate-800/80">
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" /> Patient Reviews
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 max-h-[400px] overflow-y-auto scrollbar-thin">
              {reviews.length === 0 ? (
                <div className="text-center p-6 text-slate-500">
                  <MessageSquare className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold">No reviews yet</p>
                  <p className="text-xs text-slate-400 mt-0.5">Be the first to review Dr. {user?.firstName}</p>
                </div>
              ) : (
                reviews.map((rev) => <ReviewCard key={rev._id} review={rev} />)
              )}
            </CardContent>
          </Card>

          {/* Review Submission Form */}
          <Card className="border border-slate-100 dark:border-slate-800">
            <CardHeader><CardTitle className="text-base">Write a Review</CardTitle></CardHeader>
            <CardContent>
              {reviewSuccess ? (
                <div className="text-center py-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl">
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Review submitted successfully!</p>
                  <p className="text-xs text-slate-400 mt-0.5">Thank you for sharing your feedback.</p>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  {reviewError && (
                    <div className="p-3 text-xs bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 rounded-lg text-red-700 dark:text-red-300 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{reviewError}</span>
                    </div>
                  )}

                  {/* Rating Selector */}
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Rating</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="focus:outline-none transition transform hover:scale-110"
                        >
                          <Star
                            className={`h-6 w-6 ${
                              star <= reviewRating
                                ? 'fill-amber-500 stroke-amber-500'
                                : 'stroke-slate-350 fill-none dark:stroke-slate-700'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feedback Textarea */}
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Your Review</span>
                    <textarea
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share your consultation experience (wait time, doctor bedside manner, etc.)..."
                      className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-2.5 focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={addReviewMutation.isPending}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 shadow"
                  >
                    Submit Feedback
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
