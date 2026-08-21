'use client';

import React from 'react';

interface PhoneMockupProps {
  children: React.ReactNode;
}

export function PhoneMockup({ children }: PhoneMockupProps) {
  return (
    <div className="relative w-full max-w-[390px] shrink-0">
      <span aria-hidden="true" className="absolute -left-1.5 top-28 h-10 w-1.5 rounded-l-full bg-[#2c3338] shadow-sm"></span>
      <span aria-hidden="true" className="absolute -left-1.5 top-40 h-16 w-1.5 rounded-l-full bg-[#2c3338] shadow-sm"></span>
      <span aria-hidden="true" className="absolute -right-1.5 top-36 h-20 w-1.5 rounded-r-full bg-[#2c3338] shadow-sm"></span>

      <div className="w-full bg-[#111618] p-2.5 sm:p-3.5 rounded-[3.4rem] shadow-[0_28px_60px_rgba(15,23,42,0.3)] border-[5px] border-[#2c3338] relative overflow-hidden transition-all duration-300">

        <div className="bg-background rounded-[2.65rem] overflow-hidden flex flex-col h-[650px] sm:h-[720px] border border-black/20 relative shadow-inner">

          <div className="pt-3 px-5 flex items-center justify-between text-[11px] font-bold text-on-surface/80 select-none shrink-0 bg-surface/80 backdrop-blur-sm z-20">
            <span>9:41</span>
            <div className="w-20 h-4 bg-black rounded-full flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-dark-surface-alt"></span>
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">signal_cellular_4_bar</span>
              <span className="material-symbols-outlined text-xs">wifi</span>
              <span className="material-symbols-outlined text-xs">battery_full</span>
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative flex flex-col">
            {children}
          </div>

          <div className="py-2.5 flex justify-center shrink-0 bg-surface/80 backdrop-blur-sm z-20">
            <div className="w-28 h-1 bg-on-surface/30 rounded-full"></div>
          </div>

        </div>
      </div>
    </div>
  );
}
