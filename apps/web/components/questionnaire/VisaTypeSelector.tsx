'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Briefcase, GraduationCap, Plane, Users, Building2, Home } from 'lucide-react';

interface VisaTypeOption {
  value: string; // Internal value (normalized)
  label: string; // Display label
  description?: string;
  icon?: React.ReactNode;
}

const VISA_TYPE_OPTIONS: VisaTypeOption[] = [
  {
    value: 'Tourist Visa',
    label: 'Tourist Visa',
    description: 'For tourism and leisure travel',
    icon: <Plane size={18} />,
  },
  {
    value: 'Student Visa',
    label: 'Student Visa',
    description: 'For academic or language study',
    icon: <GraduationCap size={18} />,
  },
  {
    value: 'Work Visa',
    label: 'Work Visa',
    description: 'For employment and skilled workers',
    icon: <Briefcase size={18} />,
  },
  {
    value: 'Business Visa',
    label: 'Business Visa',
    description: 'For business meetings and conferences',
    icon: <Building2 size={18} />,
  },
  {
    value: 'Family/Visitor Visa',
    label: 'Family/Visitor Visa',
    description: 'For family visits and reunions',
    icon: <Users size={18} />,
  },
  {
    value: 'Transit Visa',
    label: 'Transit Visa',
    description: 'For airport or short transit',
    icon: <Plane size={18} />,
  },
];

interface VisaTypeSelectorProps {
  value?: string; // visa type value (normalized)
  onChange: (visaType: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
}

export function VisaTypeSelector({
  value,
  onChange,
  placeholder = 'Select visa type',
  label,
  error,
}: VisaTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = VISA_TYPE_OPTIONS.find((opt) => opt.value === value);

  const filteredOptions = VISA_TYPE_OPTIONS.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    option.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (visaTypeValue: string) => {
    onChange(visaTypeValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-white/90 mb-2">
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
        className={`mt-1 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-white shadow-card-soft transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 ${
          error ? 'border-red-500/50' : ''
        } ${isOpen ? 'border-primary ring-2 ring-primary/20' : ''}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {selectedOption ? (
            <>
              <span className="shrink-0 text-white/70">
                {selectedOption.icon}
              </span>
              <span className="truncate text-white">{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-white/50">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          size={20}
          className={`shrink-0 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-white/10 bg-gradient-to-br from-[#0C1525] to-[#060a18] shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          {/* Search input */}
          <div className="sticky top-0 border-b border-white/10 bg-white/5 p-3">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search visa types..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-10 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Visa type list */}
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-white/60">
                No visa types found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full flex items-start gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? 'bg-primary/20 text-white'
                        : 'text-white/90 hover:bg-white/10'
                    }`}
                  >
                    <span className="shrink-0 text-white/70 mt-0.5">
                      {option.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{option.label}</div>
                      {option.description && (
                        <div className="mt-0.5 text-xs text-white/60">
                          {option.description}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check size={18} className="shrink-0 text-primary mt-0.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-300">{error}</p>
      )}
    </div>
  );
}

