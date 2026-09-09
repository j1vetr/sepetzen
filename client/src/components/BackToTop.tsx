import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const lastY = useRef(window.scrollY);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const scrolledEnough = y > 400;
      const scrollingUp = y < lastY.current;
      setVisible(scrolledEnough && scrollingUp);
      lastY.current = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="back-to-top"
          initial={{ opacity: 0, y: 12, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.88 }}
          transition={{ duration: 0.22, ease: [0.33, 1, 0.68, 1] }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Başa dön"
          className="fixed bottom-24 right-4 z-50 w-11 h-11 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(255,255,255,0.10)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <ArrowUp className="w-5 h-5 text-white" strokeWidth={2} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
