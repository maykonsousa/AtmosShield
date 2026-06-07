"use client";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const variants: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 28 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
    },
  };
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

/** Staggered container — children use `stagger-item` variant */
export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.1,
  delayStart = 0,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  delayStart?: number;
}) {
  const reduce = useReducedMotion();
  const containerVariants: Variants = {
    hidden: {},
    show: {
      transition: {
        delayChildren: reduce ? 0 : delayStart,
        staggerChildren: reduce ? 0 : staggerDelay,
      },
    },
  };
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 32 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    },
  };
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}
