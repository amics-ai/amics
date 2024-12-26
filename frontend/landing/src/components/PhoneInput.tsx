import { useState, useEffect, useRef } from 'react';
import { phonePrefixes } from '@/data/phonePrefixes';
import { parsePhoneNumber, isValidPhoneNumber, formatNumber, type CountryCode } from 'libphonenumber-js';
import { savePhoneNumber } from '@/db/queries';

export default function PhoneInput() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Validate phone number whenever it changes
  useEffect(() => {
    if (!phoneNumber.trim()) {
      setError('');
      setIsValid(false);
      return;
    }

    try {
      const selectedCountry = phonePrefixes.find(c => c.prefix === countryCode);
      if (!selectedCountry) return;
      const fullNumber = countryCode + phoneNumber.replace(/\D/g, '');
      const isValidNum = isValidPhoneNumber(fullNumber, { defaultCountry: selectedCountry.code as CountryCode });
      const parsed = parsePhoneNumber(fullNumber, { defaultCountry: selectedCountry.code as CountryCode });
      const matchesCountry = parsed?.countryCallingCode === countryCode.replace('+', '');

      if (!matchesCountry) {
        setError('Phone number does not match selected country code');
        setIsValid(false);
      } else if (!isValidNum) {
        setError('Please enter a valid phone number');
        setIsValid(false);
      } else {
        setError('');
        setIsValid(true);
      }
    } catch (e) {
      setError('Please enter a valid phone number');
      setIsValid(false);
    }
  }, [phoneNumber, countryCode]);

  // Format phone number as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ''); // Remove non-digits
    try {
      const selectedCountry = phonePrefixes.find(c => c.prefix === countryCode);
      if (selectedCountry) {
        const parsed = parsePhoneNumber(countryCode + input, selectedCountry.code as CountryCode);
        const formatted = parsed ? parsed.formatNational() : input;
        setPhoneNumber(formatted);
      } else {
        setPhoneNumber(input);
      }
    } catch (e) {
      setPhoneNumber(input);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    
    try {
      setIsSubmitting(true);
      const selectedCountry = phonePrefixes.find(c => c.prefix === countryCode);
      if (!selectedCountry) return;
      
      const fullNumber = countryCode + phoneNumber.replace(/\D/g, '');
      const parsed = parsePhoneNumber(fullNumber, selectedCountry.code as CountryCode);
      const internationalNumber = parsed?.format('E.164');
      
      if (!internationalNumber) return;
      console.log("Saving phone", internationalNumber, countryCode)
      // Save to localStorage
      localStorage.setItem('userPhone', internationalNumber);
      
      try {
        // Save to database
        await savePhoneNumber(internationalNumber, countryCode);
        setIsExistingUser(false);
      } catch (error: any) {
        if (error.cause === 409) { // Postgres unique violation code
          setIsExistingUser(true);
        } else {
          throw error;
        }
      }
      
      // Show dialog
      setShowDialog(true);
    } catch (e) {
      console.error('Error submitting:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredPrefixes = phonePrefixes
    .filter(country => 
      country.name.toLowerCase().includes(search.toLowerCase()) ||
      country.prefix.includes(search) ||
      country.code.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      // Popular countries first
      if (a.popular && !b.popular) return -1;
      if (!a.popular && b.popular) return 1;
      return a.name.localeCompare(b.name);
    });

  const selectedCountry = phonePrefixes.find(country => country.prefix === countryCode);

  return (
    <>
      <form onSubmit={handleSubmit} className="max-w-md mx-auto">
        <div className="flex gap-2 mb-4">
          {/* Country Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              className="w-24 px-3 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 flex items-center justify-between"
              onClick={() => setIsOpen(!isOpen)}
            >
              <span className="flex items-center gap-2">
                <span className="text-xl">{selectedCountry?.flag}</span>
                <span>{selectedCountry?.prefix}</span>
              </span>
              <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Dropdown */}
            {isOpen && (
              <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="p-2">
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="Search countries..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredPrefixes.map((country) => (
                    <button
                      key={`${country.code}-${country.prefix}`}
                      type="button"
                      className={`w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-50
                        ${country.prefix === countryCode ? 'bg-gray-50' : ''}`}
                      onClick={() => {
                        setCountryCode(country.prefix);
                        setIsOpen(false);
                      }}
                    >
                      <span className="text-xl">{country.flag}</span>
                      <div>
                        <div className="font-medium">{country.name}</div>
                        <div className="text-sm text-gray-500">{country.prefix}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Phone Number Input */}
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                
              </div>
              <input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="Enter your phone number"
                className={`w-full px-4 py-3 bg-white border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500
                  font-mono text-lg tracking-wide
                  ${error ? 'border-red-500' : 'border-gray-300'}
                  ${isValid ? 'border-green-500' : ''}`}
                required
              />
              {isValid && (
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            {error && (
              <p className="mt-1 text-sm text-red-500 pl-12">{error}</p>
            )}
          </div>
        </div>

        {/* Call Me Button */}
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="w-full bg-sky-500 hover:bg-sky-600 text-white font-geist-medium px-6 py-3 rounded-lg 
            transition-all duration-300 ease-out
            shadow-[0_4px_12px_rgba(14,165,233,0.3)] 
            hover:shadow-[0_6px_20px_rgba(14,165,233,0.4)] 
            hover:transform hover:-translate-y-0.5
            active:transform active:translate-y-0.5
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none
            group"
        >
          <span className="flex items-center justify-center gap-2">
            {isSubmitting ? 'loading...' : 'Call Me Now'}
            <svg 
              className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M17 8l4 4m0 0l-4 4m4-4H3" 
              />
            </svg>
          </span>
        </button>
      </form>

      {/* Beta Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" role="dialog" aria-modal="true">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 relative">
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setShowDialog(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close dialog"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <h3 className="text-xl font-geist-medium mb-4">Private Beta</h3>
            <p className="text-gray-600 mb-6">
              {isExistingUser 
                ? "This phone number is already registered. We'll notify you as soon as we're available in your area."
                : "Thank you for your interest! Our service is currently in private beta. We'll notify you as soon as we're available in your area."
              }
            </p>
            <button
              onClick={() => setShowDialog(false)}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-geist-medium px-4 py-2 rounded-lg transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
} 