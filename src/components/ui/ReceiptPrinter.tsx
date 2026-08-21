'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState, useRef, type ReactNode } from 'react';

export type ReceiptPrinterStage = 'idle' | 'processing' | 'printing' | 'complete';

interface ReceiptPrinterProps {
  stage: ReceiptPrinterStage;
  children: ReactNode;
  className?: string;
}

const STATUS_LABELS: Record<ReceiptPrinterStage, string> = {
  idle: 'Ready to print',
  processing: 'Processing your bill',
  printing: 'Printing receipt',
  complete: 'Print complete',
};

const easeOut = [0.23, 1, 0.32, 1] as const;
const easeInOut = [0.77, 0, 0.175, 1] as const;

const printingKeyframes = [
  'translateY(calc(-100% + 2px))',
  'translateY(-91%)', 'translateY(-91%)',
  'translateY(-81%)', 'translateY(-81%)',
  'translateY(-70%)', 'translateY(-70%)',
  'translateY(-58%)', 'translateY(-58%)',
  'translateY(-45%)', 'translateY(-45%)',
  'translateY(-32%)', 'translateY(-32%)',
  'translateY(-20%)', 'translateY(-20%)',
  'translateY(-10%)', 'translateY(-10%)',
  'translateY(-3%)', 'translateY(-3%)',
  'translateY(0%)',
];

const printingTimes = [
  0, 0.075, 0.105, 0.18, 0.21, 0.285, 0.315, 0.39, 0.42,
  0.495, 0.525, 0.6, 0.63, 0.705, 0.735, 0.81, 0.84, 0.915, 0.945, 1,
];

export function ReceiptPrinter({ stage, children, className = '' }: ReceiptPrinterProps) {
  const shouldReduceMotion = useReducedMotion();
  const shouldMove = !shouldReduceMotion;
  const isPrinting = stage === 'printing' && shouldMove;
  const isComplete = stage === 'complete';
  const isVisible = stage !== 'idle';

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Status indicator */}
      <div className="flex items-center gap-2 text-xs text-on-surface-variant h-5">
        <AnimatePresence initial={false} mode="sync">
          {stage === 'processing' && (
            <motion.span
              key="spinner"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: shouldMove ? 0.16 : 0, ease: easeOut }}
              className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
              style={{ animation: shouldMove ? 'receiptSpin 0.9s linear infinite' : 'none' }}
            />
          )}
          {isComplete && (
            <motion.span
              key="check"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: shouldMove ? 0.3 : 0, ease: [0.34, 1.56, 0.64, 1] }}
              className="material-symbols-outlined text-sm text-success"
            >
              check_circle
            </motion.span>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false} mode="sync">
          <motion.span
            key={stage}
            initial={{ opacity: 0, y: shouldMove ? 6 : 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: shouldMove ? -6 : 0 }}
            transition={{ duration: shouldMove ? 0.18 : 0, ease: easeOut }}
            className="truncate"
          >
            {STATUS_LABELS[stage]}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Printer machine */}
      <motion.div
        animate={isPrinting ? { boxShadow: [
          '0 20px 36px -20px rgba(0,0,0,0.18), 0 6px 14px -8px rgba(0,0,0,0.08)',
          '0 20px 36px -20px rgba(0,0,0,0.28), 0 6px 14px -8px rgba(0,0,0,0.14)',
          '0 20px 36px -20px rgba(0,0,0,0.18), 0 6px 14px -8px rgba(0,0,0,0.08)',
        ] } : {}}
        transition={isPrinting ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : {}}
        className="relative w-full max-w-sm rounded-2xl border border-outline-variant bg-gradient-to-b from-surface to-surface-container-low p-3 pb-8 shadow-lg"
      >
        {/* Printer slot */}
        <div className="absolute inset-x-6 bottom-3 h-2 rounded bg-on-surface/80 shadow-inner z-40" />

        {/* Paper output area */}
        <div className="relative z-10 -mt-4 overflow-hidden">
          {/* Paper shadow above slot */}
          <AnimatePresence>
            {isVisible && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: shouldMove ? 0.16 : 0 }}
                className="pointer-events-none absolute inset-x-4 -top-1 z-20 h-2 bg-on-surface/20 blur-sm rounded"
              />
            )}
          </AnimatePresence>

          {/* Paper */}
          <motion.div
            animate={{
              opacity: isVisible ? 1 : 0,
              transform: isPrinting
                ? printingKeyframes[printingKeyframes.length - 1] // end state while keyframes run
                : isComplete || !shouldMove
                  ? 'translateY(0%)'
                  : 'translateY(calc(-100% + 2px))',
            }}
            initial={false}
            transition={{
              opacity: { duration: shouldMove ? 0.16 : 0, ease: easeOut },
              transform: {
                duration: shouldMove ? 1.8 : 0,
                ease: isPrinting ? 'linear' : easeInOut,
                times: isPrinting ? printingTimes : undefined,
                ...(isPrinting && { keyframes: printingKeyframes }),
              },
            }}
            className="receipt-tooth-edge relative bg-white px-5 pt-6 pb-8 font-mono text-xs text-on-surface"
            style={{
              minHeight: '20rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            }}
          >
            {children}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Preset bill layout for vehicle invoices ── */

interface BillReceiptProps {
  invoiceNumber: string;
  vehicleReg: string;
  vehicleModel?: string;
  riderName: string;
  riderPhone?: string;
  distanceKm: number;
  fuelLitres?: number;
  fuelPrice?: number;
  ratePerKm?: number;
  subtotal: number;
  total: number;
  issuedAt: string;
  paymentStatus: string;
}

export function BillReceipt({
  invoiceNumber,
  vehicleReg,
  vehicleModel,
  riderName,
  riderPhone,
  distanceKm,
  fuelLitres,
  fuelPrice,
  ratePerKm,
  subtotal,
  total,
  issuedAt,
  paymentStatus,
}: BillReceiptProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="text-center border-b border-dashed border-on-surface/20 pb-3">
        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Veylo Verified Bill</p>
        <p className="font-extrabold text-sm mt-1">{invoiceNumber}</p>
        <p className="text-[10px] text-on-surface-variant">{new Date(issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      </div>

      {/* Vehicle & Rider */}
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Vehicle</span>
          <span className="font-bold">{vehicleReg}</span>
        </div>
        {vehicleModel && (
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Model</span>
            <span>{vehicleModel}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Rider</span>
          <span className="font-bold">{riderName}</span>
        </div>
        {riderPhone && (
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Phone</span>
            <span>{riderPhone}</span>
          </div>
        )}
      </div>

      {/* Journey */}
      <div className="border-t border-dashed border-on-surface/20 pt-2 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Distance</span>
          <span className="font-bold">{distanceKm} km</span>
        </div>
        {fuelLitres !== undefined && (
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Fuel Used</span>
            <span>{fuelLitres.toFixed(2)} L</span>
          </div>
        )}
        {fuelPrice !== undefined && (
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Fuel Price</span>
            <span>₹{fuelPrice.toFixed(2)}/L</span>
          </div>
        )}
        {ratePerKm !== undefined && (
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Rate</span>
            <span>₹{ratePerKm}/km</span>
          </div>
        )}
      </div>

      {/* Total */}
      <div className="border-t border-dashed border-on-surface/20 pt-2 space-y-1 text-[11px]">
        {fuelLitres !== undefined && fuelPrice !== undefined && (
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Fuel Expense</span>
            <span>₹{(fuelLitres * fuelPrice).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Distance Charge</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between pt-1 border-t border-on-surface/20">
          <span className="font-extrabold text-sm">TOTAL</span>
          <span className="font-extrabold text-sm">₹{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-2 border-t border-dashed border-on-surface/20">
        <p className="text-[9px] text-on-surface-variant uppercase tracking-wider">
          {paymentStatus === 'PAID' ? '✓ Paid' : 'Payment Pending'}
        </p>
        <p className="text-[8px] text-on-surface-variant mt-1">veylo.in</p>
      </div>
    </div>
  );
}

/* ── Auto-advance hook ── */

export function useReceiptPrinting() {
  const [stage, setStage] = useState<ReceiptPrinterStage>('idle');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startPrinting = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStage('processing');

    timerRef.current = setTimeout(() => {
      setStage('printing');
      timerRef.current = setTimeout(() => {
        setStage('complete');
      }, 2000);
    }, 1200);
  };

  const reset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStage('idle');
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { stage, startPrinting, reset };
}
