'use client';

import React, { useState, useEffect } from 'react';
import { STEPS, STEP_GROUPS } from './HowItWorksSteps';
import { PhoneMockup } from './PhoneMockup';
import { StepScreens } from './StepScreens';

export function HowItWorksInteractive() {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progressPercent, setProgressPercent] = useState<number>(0);

  const [rideDistance, setRideDistance] = useState<number>(12.4);
  const [rideCost, setRideCost] = useState<number>(184.20);
  const [rideSeconds, setRideSeconds] = useState<number>(1476);

  const currentStep = STEPS[activeStepIndex];
  const activeGroupIndex = currentStep.stepGroupIndex;

  useEffect(() => {
    if (!isPlaying) return;

    const duration = currentStep.durationMs;
    const intervalTime = 50;
    const stepIncrement = (intervalTime / duration) * 100;

    const interval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev + stepIncrement >= 100) {
          setActiveStepIndex((current) => (current + 1) % STEPS.length);
          return 0;
        }
        return prev + stepIncrement;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isPlaying, activeStepIndex, currentStep.durationMs]);

  useEffect(() => {
    if (activeStepIndex === 3) {
      const liveInterval = setInterval(() => {
        setRideDistance((d) => Number((d + 0.05).toFixed(2)));
        setRideCost((c) => Number((c + 0.45).toFixed(2)));
        setRideSeconds((s) => s + 1);
      }, 900);
      return () => clearInterval(liveInterval);
    } else {
      setRideDistance(12.4);
      setRideCost(184.20);
      setRideSeconds(1476);
    }
  }, [activeStepIndex]);

  const handleSelectGroup = (groupIndex: number) => {
    const targetScreen = STEP_GROUPS[groupIndex].screens[0];
    setActiveStepIndex(targetScreen);
    setProgressPercent(0);
  };

  const handleSelectScreen = (idx: number) => {
    setActiveStepIndex(idx);
    setProgressPercent(0);
  };

  return (
    <section className="py-16 sm:py-20 relative overflow-hidden" id="how-it-works">
      
      <div className="absolute top-10 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-0"></div>
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-primary-container/5 rounded-full blur-3xl pointer-events-none -z-0"></div>

      <div className="max-w-7xl mx-auto relative z-10 space-y-10">
        
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">sync</span>
            Interactive Platform Flow
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight">
            How Veylo Works
          </h2>
          <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
            From smart vehicle discovery and instant QR unlock to live GPS telemetry and direct UPI settlements — experience the complete journey.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-3">
              {STEP_GROUPS.map((group) => {
                const isActive = group.groupIndex === activeGroupIndex;

                return (
                  <button
                    key={group.groupIndex}
                    type="button"
                    onClick={() => handleSelectGroup(group.groupIndex)}
                    className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                      isActive
                        ? 'bg-surface-container-low border-primary shadow-md ring-1 ring-primary/20'
                        : 'bg-surface border-outline-variant/60 hover:bg-surface-container-lowest hover:border-outline-variant'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-surface-container">
                        <div
                          className="h-full bg-primary transition-all duration-100 ease-linear"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 transition-all ${
                          isActive
                            ? 'bg-primary text-on-primary shadow-sm scale-105'
                            : 'bg-surface-container text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl">{group.icon}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                              isActive ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant'
                            }`}>
                              STEP {group.number}
                            </span>
                            <h3 className={`font-bold text-base transition-colors ${
                              isActive ? 'text-on-surface' : 'text-on-surface/80 group-hover:text-on-surface'
                            }`}>
                              {group.title}
                            </h3>
                          </div>

                          {isActive && (
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                          )}
                        </div>

                        <p className={`text-xs leading-relaxed transition-colors ${
                          isActive ? 'text-on-surface-variant' : 'text-on-surface-variant/70'
                        }`}>
                          {group.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 px-2">
              <div className="flex items-center gap-1.5">
                {STEPS.map((step, idx) => (
                  <button
                    key={step.key}
                    onClick={() => handleSelectScreen(idx)}
                    title={step.title}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      activeStepIndex === idx
                        ? 'w-6 bg-primary'
                        : 'w-2 bg-outline-variant hover:bg-outline'
                    }`}
                  ></button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectScreen((activeStepIndex - 1 + STEPS.length) % STEPS.length)}
                  className="p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container text-xs flex items-center justify-center transition-all"
                  title="Previous Screen"
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
                    isPlaying
                      ? 'border-outline-variant bg-surface text-on-surface hover:bg-surface-container'
                      : 'border-primary bg-primary text-on-primary shadow-sm'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                  <span>{isPlaying ? 'Auto Playing' : 'Paused'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectScreen((activeStepIndex + 1) % STEPS.length)}
                  className="p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container text-xs flex items-center justify-center transition-all"
                  title="Next Screen"
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end relative">
            
            <div className="absolute -top-4 right-2 sm:right-6 z-30 animate-float-badge">
              <div className="bg-surface/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-outline-variant shadow-lg flex items-center gap-2.5 text-xs font-bold text-on-surface">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">{currentStep.floatingChip.icon}</span>
                </div>
                <div>
                  <p className="text-[11px] font-extrabold text-on-surface">{currentStep.floatingChip.text}</p>
                  <span className="text-[9px] font-mono text-emerald-700 font-semibold">{currentStep.floatingChip.badge}</span>
                </div>
              </div>
            </div>

            <PhoneMockup>
              <StepScreens
                activeStepIndex={activeStepIndex}
                onNavigate={handleSelectScreen}
                rideDistance={rideDistance}
                rideCost={rideCost}
                rideSeconds={rideSeconds}
              />
            </PhoneMockup>
          </div>

        </div>

        <div className="pt-6 border-t border-outline-variant/60 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-on-surface-variant mb-2">
            <span className="font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-sm">electric_moped</span>
              End-to-End Autonomous Mobility Fleet Experience
            </span>
            <span className="font-mono text-[10px] text-on-surface-variant">Live in Kozhikode, Kerala</span>
          </div>

          <div className="h-10 relative overflow-hidden bg-surface-container-lowest rounded-xl border border-outline-variant/40 flex items-center">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-outline-variant/60"></div>

            <div className="absolute animate-rider-traverse flex items-center gap-1 text-primary">
              <svg width="34" height="24" viewBox="0 0 34 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="6" r="3" fill="currentColor" />
                <path d="M14 9 L 18 13 L 23 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M8 18 L 17 18 L 22 13 L 26 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M22 13 L 24 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <g className="animate-wheel-spin origin-[8px_18px]">
                  <circle cx="8" cy="18" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="8" y1="14" x2="8" y2="22" stroke="currentColor" strokeWidth="1" />
                  <line x1="4" y1="18" x2="12" y2="18" stroke="currentColor" strokeWidth="1" />
                </g>
                <g className="animate-wheel-spin origin-[26px_18px]">
                  <circle cx="26" cy="18" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="26" y1="14" x2="26" y2="22" stroke="currentColor" strokeWidth="1" />
                  <line x1="22" y1="18" x2="30" y2="18" stroke="currentColor" strokeWidth="1" />
                </g>
              </svg>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
