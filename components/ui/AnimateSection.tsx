"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AnimateSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function AnimateSection({ children, className, delay = 0 }: AnimateSectionProps) {
  return (
    <motion.div
      className={className}
      initial={false}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
