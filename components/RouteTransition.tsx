'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import React from 'react';

const pageVariants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.98
  },
  enter: { 
    opacity: 1, 
    y: 0,
    scale: 1
  },
  exit: { 
    opacity: 0, 
    y: -10,
    scale: 0.99
  },
};

export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
        transition={{ 
          duration: 0.35, 
          ease: [0.25, 0.46, 0.45, 0.94],
          opacity: { duration: 0.25 }
        }}
        className="min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
