"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from "motion/react";

/**
 * Motion vocabulary.
 *
 * Four movements, used consistently: pages settle, lists reveal, overlays
 * fade with a hint of scale, and booking steps slide along the direction of
 * travel. Durations sit between 160ms and 280ms — long enough to be read as
 * motion, short enough that nobody waits for it.
 *
 * Every helper collapses to a plain fade, or to nothing at all, when the
 * visitor has asked for reduced motion.
 */

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE = [0.4, 0, 0.2, 1] as const;

export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.12 : 0.24, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Reveals a list on first paint. The stagger is deliberately small and capped:
 * a grid of twelve clinic cards should feel like one movement, not twelve.
 */
export function Reveal({
  children,
  index = 0,
  className,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const delay = reduce ? 0 : Math.min(index, 8) * 0.035;

  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.12 : 0.28, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({ children, className, ...rest }: HTMLMotionProps<"div"> & { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.1 : 0.18, ease: EASE }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Booking steps. Direction follows the user's travel through the flow. */
export function StepTransition({
  children,
  stepKey,
  direction = 1,
}: {
  children: React.ReactNode;
  stepKey: string | number;
  direction?: 1 | -1;
}) {
  const reduce = useReducedMotion();
  const offset = reduce ? 0 : 16 * direction;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stepKey}
        initial={{ opacity: 0, x: offset }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -offset }}
        transition={{ duration: reduce ? 0.12 : 0.22, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** A confirmation mark that draws itself once. No confetti, no bounce. */
export function SuccessCheck({ size = 44 }: { size?: number }) {
  const reduce = useReducedMotion();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      fill="none"
      role="img"
      aria-label="Confirmed"
      className="text-success"
    >
      <motion.circle
        cx="26"
        cy="26"
        r="24"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity={0.35}
        initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reduce ? 0 : 0.45, ease: EASE_OUT }}
      />
      <motion.path
        d="M16 27.5 23 34l13-14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reduce ? 0 : 0.3, ease: EASE_OUT, delay: reduce ? 0 : 0.28 }}
      />
    </svg>
  );
}

export { AnimatePresence, motion, useReducedMotion };
