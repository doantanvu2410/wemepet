import { useEffect, useState } from 'react';

export const useScrollDirection = () => {
  const [direction, setDirection] = useState('up');

  useEffect(() => {
    let lastScroll = window.pageYOffset;
    const handler = () => {
      const current = window.pageYOffset;
      if (Math.abs(current - lastScroll) < 10) return;
      if (current > lastScroll) {
        setDirection('down');
      } else if (current < lastScroll) {
        setDirection('up');
      }
      lastScroll = current;
    };

    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return direction;
};
