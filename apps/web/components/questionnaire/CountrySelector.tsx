'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface Country {
  code: string;
  name: string;
}

interface CountrySelectorProps {
  countries: Country[];
  value?: string; // country code
  onChange: (countryCode: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
}

function codeToFlag(code: string): string {
  if (!code || code.length !== 2) return '🌍';
  const base = 0x1f1e6;
  const upper = code.toUpperCase();
  const chars = upper.split('').map((c) => base + (c.charCodeAt(0) - 65));
  return String.fromCodePoint(...chars);
}

export function CountrySelector({
  countries,
  value,
  onChange,
  placeholder = 'Select country',
  label,
  error,
}: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = countries.find((c) => c.code === value);

  const filteredCountries = countries.filter((country) =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase())
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

  const handleSelect = (countryCode: string) => {
    onChange(countryCode);
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
          {selectedCountry ? (
            <>
              <span className="text-xl shrink-0">{codeToFlag(selectedCountry.code)}</span>
              <span className="truncate text-white">{selectedCountry.name}</span>
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
                placeholder="Search countries..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-10 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Country list */}
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredCountries.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-white/60">
                No countries found
              </div>
            ) : (
              filteredCountries.map((country) => {
                const isSelected = country.code === value;
                return (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleSelect(country.code)}
                    className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? 'bg-primary/20 text-white'
                        : 'text-white/90 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-xl shrink-0">{codeToFlag(country.code)}</span>
                    <span className="flex-1 truncate font-medium">{country.name}</span>
                    {isSelected && (
                      <Check size={18} className="shrink-0 text-primary" />
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




