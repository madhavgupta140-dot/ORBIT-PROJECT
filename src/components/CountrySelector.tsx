import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X, Globe } from 'lucide-react';
import { COUNTRIES, CountryOption, getCountryByCode, getCountryByName } from '../data/countries';

interface CountrySelectorProps {
  countryCode?: string;
  countryName?: string;
  onChange: (country: CountryOption | null) => void;
  disabled?: boolean;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  countryCode,
  countryName,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Derive current selected country from code or name
  const selectedCountry = useMemo(() => {
    if (countryCode) {
      const byCode = getCountryByCode(countryCode);
      if (byCode) return byCode;
    }
    if (countryName) {
      const byName = getCountryByName(countryName);
      if (byName) return byName;
    }
    return null;
  }, [countryCode, countryName]);

  // Filtered countries based on user query
  const filteredCountries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Reset highlight index when filter changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredCountries.length]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredCountries.length - 1 ? prev + 1 : 0
      );
      scrollItemIntoView(highlightedIndex + 1);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredCountries.length - 1
      );
      scrollItemIntoView(highlightedIndex - 1);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCountries[highlightedIndex]) {
        handleSelect(filteredCountries[highlightedIndex]);
      }
    }
  };

  const scrollItemIntoView = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-country-item]');
    const targetItem = items[index] as HTMLElement;
    if (targetItem) {
      targetItem.scrollIntoView({ block: 'nearest' });
    }
  };

  const handleSelect = (country: CountryOption) => {
    onChange(country);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div ref={containerRef} className="relative w-full" onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-[#161616] hover:bg-[#1a1a1a] border rounded-xl text-xs transition-colors cursor-pointer text-left ${
          isOpen
            ? 'border-white text-stone-100 ring-1 ring-white/20'
            : 'border-stone-800 text-stone-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Globe className="w-3.5 h-3.5 text-stone-500 shrink-0" />
          {selectedCountry ? (
            <span className="truncate font-medium text-stone-100">
              {selectedCountry.name}
            </span>
          ) : (
            <span className="text-stone-500 truncate">Select country...</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedCountry && !disabled && (
            <span
              role="button"
              onClick={handleClear}
              className="p-1 text-stone-500 hover:text-stone-200 rounded-full hover:bg-stone-800 transition-colors"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-stone-500 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-white' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#141414] border border-stone-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-72 flex flex-col"
        >
          {/* Search Header */}
          <div className="p-2 border-b border-stone-800/80 bg-[#121212] sticky top-0 z-10">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 w-3.5 h-3.5 text-stone-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ISO countries..."
                className="w-full bg-[#1c1c1c] border border-stone-800 focus:border-white/60 text-xs text-stone-100 pl-8 pr-7 py-1.5 rounded-lg focus:outline-none placeholder:text-stone-600 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-stone-500 hover:text-stone-300 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* List items */}
          <div ref={listRef} className="overflow-y-auto max-h-56 p-1 divide-y divide-stone-900/50">
            {filteredCountries.length === 0 ? (
              <div className="p-4 text-center text-xs text-stone-500">
                No matching country found.
              </div>
            ) : (
              filteredCountries.map((country, index) => {
                const isSelected = selectedCountry?.code === country.code;
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={country.code}
                    data-country-item
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(country)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-white/10 text-white font-medium'
                        : isHighlighted
                        ? 'bg-stone-800/70 text-stone-100'
                        : 'text-stone-300 hover:bg-stone-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-[10px] text-stone-500 w-6 shrink-0">
                        {country.code}
                      </span>
                      <span className="truncate">{country.name}</span>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-white shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="px-3 py-1.5 border-t border-stone-800/80 bg-[#101010] text-[10px] text-stone-500 font-mono flex items-center justify-between">
            <span>ISO 3166-1 standard</span>
            <span>{filteredCountries.length} countries</span>
          </div>
        </div>
      )}
    </div>
  );
};
