import { useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { SlidersHorizontal, User, DollarSign, Calendar, Globe, Stethoscope, Award } from 'lucide-react';

export function DoctorFilter({ filters, onChange, specializations = [] }) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onChange({
      specialization: '',
      gender: '',
      language: '',
      consultationMode: '',
      maxFee: '',
      minExperience: '',
      availabilityToday: 'false',
    });
  };

  const languageOptions = ['English', 'Hindi', 'Spanish', 'French'];
  const modeOptions = [
    { value: 'physical', label: 'In-Person (Physical)' },
    { value: 'video', label: 'Video Consult' },
    { value: 'audio', label: 'Audio Consult' },
    { value: 'chat', label: 'Chat Consult' },
  ];

  return (
    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <CardContent className="p-4 space-y-5">
        <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-teal-600" /> Filter Doctors
          </h3>
          <button
            onClick={clearFilters}
            className="text-xs text-teal-600 hover:text-teal-700 font-semibold transition"
          >
            Clear All
          </button>
        </div>

        {/* Specialization */}
        {specializations.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5" /> Speciality
            </label>
            <select
              value={filters.specialization || ''}
              onChange={(e) => updateFilter('specialization', e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2 text-xs focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-slate-100"
            >
              <option value="">All Specialities</option>
              {specializations.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Gender Filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" /> Doctor Gender
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['', 'male', 'female'].map((gender) => (
              <button
                key={gender}
                onClick={() => updateFilter('gender', gender)}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition ${
                  (filters.gender || '') === gender
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-slate-50 border-slate-200 dark:bg-slate-850 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-100'
                }`}
              >
                {gender === '' ? 'Any' : gender.charAt(0).toUpperCase() + gender.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Consultation Mode */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Consultation Mode
          </label>
          <select
            value={filters.consultationMode || ''}
            onChange={(e) => updateFilter('consultationMode', e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2 text-xs text-slate-850 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Modes</option>
            {modeOptions.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        {/* Max consultation fee */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" /> Max Consultation Fee (INR)
          </label>
          <div className="flex gap-2">
            {[300, 500, 800, 1500].map((fee) => (
              <button
                key={fee}
                onClick={() => updateFilter('maxFee', filters.maxFee === String(fee) ? '' : String(fee))}
                className={`flex-1 py-1 rounded-lg text-xs border transition ${
                  filters.maxFee === String(fee)
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-slate-50 border-slate-200 dark:bg-slate-850 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-100'
                }`}
              >
                ₹{fee}
              </button>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" /> Language
          </label>
          <select
            value={filters.language || ''}
            onChange={(e) => updateFilter('language', e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2 text-xs text-slate-850 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Languages</option>
            {languageOptions.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        {/* Minimum Experience */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5" /> Experience (Minimum)
          </label>
          <select
            value={filters.minExperience || ''}
            onChange={(e) => updateFilter('minExperience', e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-2 text-xs text-slate-850 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Any Experience</option>
            <option value="3">3+ Years</option>
            <option value="5">5+ Years</option>
            <option value="10">10+ Years</option>
            <option value="15">15+ Years</option>
          </select>
        </div>

        {/* Availability Today */}
        <div className="flex items-center justify-between border-t pt-4 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">Available Today</span>
          <button
            type="button"
            onClick={() => updateFilter('availabilityToday', filters.availabilityToday === 'true' ? 'false' : 'true')}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              filters.availabilityToday === 'true' ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-800'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                filters.availabilityToday === 'true' ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
