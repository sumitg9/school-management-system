import React, { useState, useRef, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';

const SchoolSwitcher = () => {
  const {
    currentSchool,
    activeSchoolId,
    authorizedSchools,
    isGroupAdmin,
    switchSchool,
  } = useSchool();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (schoolId) => {
    switchSchool(schoolId);
    setIsOpen(false);
  };

  const getLogoEmoji = (logoStr) => {
    if (typeof logoStr === 'string' && logoStr.startsWith('preset:')) {
      return logoStr.replace('preset:', '');
    }
    return '🏛️';
  };

  // If user has only 1 authorized school and is NOT a group super-admin:
  // Render a locked, read-only tenant badge to prevent unauthorized switching.
  if (!isGroupAdmin && authorizedSchools.length <= 1) {
    const singleSchool = authorizedSchools[0] || currentSchool;
    return (
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/90 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs"
        title={`Tenant Isolation Active: Your account is strictly bound to ${singleSchool?.name || 'your assigned campus'}. Cross-campus switching is restricted.`}
      >
        <span className="text-sm">{getLogoEmoji(singleSchool?.logo)}</span>
        <span className="font-bold truncate max-w-[130px] sm:max-w-[180px]">
          {singleSchool?.shortName || singleSchool?.name || 'Main Campus'}
        </span>
        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ml-1">
          <span>🔒</span>
          <span className="hidden md:inline font-mono">Assigned</span>
        </span>
      </div>
    );
  }

  // Multi-school authorized user or Group Super Admin: Interactive Switcher Dropdown
  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 hover:border-blue-400 rounded-xl text-xs font-semibold text-gray-800 shadow-xs hover:bg-blue-50/50 transition focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        title="Switch active school campus context"
        aria-expanded={isOpen}
      >
        <span className="text-base">{getLogoEmoji(currentSchool?.logo)}</span>
        <div className="text-left flex flex-col">
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-blue-600 leading-tight">
            {isGroupAdmin ? 'Active Campus' : 'My Branches'}
          </span>
          <span className="font-bold text-gray-900 truncate max-w-[120px] sm:max-w-[160px] md:max-w-[200px]">
            {currentSchool?.shortName || currentSchool?.name}
          </span>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ml-1 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-72 md:w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3.5 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
              Select Campus Branch
            </span>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
              {isGroupAdmin ? 'HQ Multi-Tenant' : `${authorizedSchools.length} Authorized`}
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto py-1">
            {/* Consolidated View for Group Super Admins */}
            {isGroupAdmin && (
              <button
                type="button"
                onClick={() => handleSelect('all')}
                className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-blue-50 transition border-b border-gray-100 ${
                  activeSchoolId === 'all' ? 'bg-blue-50/80 font-bold text-blue-900' : 'text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-lg flex-shrink-0">
                    🌐
                  </div>
                  <div>
                    <div className="font-black text-gray-900 flex items-center gap-1.5">
                      <span>All Campuses</span>
                      <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-sm uppercase">HQ</span>
                    </div>
                    <div className="text-[10px] text-gray-500">
                      Consolidated cross-branch overview & analytics
                    </div>
                  </div>
                </div>
                {activeSchoolId === 'all' && (
                  <span className="text-blue-600 text-sm font-black">✓</span>
                )}
              </button>
            )}

            {/* Individual Campuses */}
            {authorizedSchools.map((school) => {
              const isSelected = String(activeSchoolId) === String(school.id);
              return (
                <button
                  key={school.id}
                  type="button"
                  onClick={() => handleSelect(school.id)}
                  className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-blue-50 transition ${
                    isSelected ? 'bg-blue-50/70 font-bold text-blue-900' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: `${school.primaryColor || '#2563EB'}15` }}
                    >
                      {getLogoEmoji(school.logo)}
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-bold text-gray-900 truncate flex items-center gap-1.5">
                        <span className="truncate">{school.shortName || school.name}</span>
                        {school.code && (
                          <span className="text-[9px] font-mono bg-gray-100 text-gray-600 px-1 py-0.2 rounded-xs">
                            {school.code}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                        <span>📍 {school.city || 'Main'}</span>
                        {school.affiliationNumber && (
                          <span>• {school.affiliationNumber.split('/')[0] || 'CBSE'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-blue-600 text-sm font-black flex-shrink-0 ml-2">✓</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="px-3.5 py-2 border-t border-gray-100 bg-gray-50/70 rounded-b-2xl flex items-center justify-between text-[10px] text-gray-500">
            <span className="flex items-center gap-1">
              <span>🛡️</span>
              <span>Data isolated per campus</span>
            </span>
            <span className="font-medium text-blue-600">SMS Tenancy v2.0</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolSwitcher;

