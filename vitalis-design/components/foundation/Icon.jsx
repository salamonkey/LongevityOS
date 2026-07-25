import React, { useEffect, useRef } from 'react';

/** Thin wrapper over Lucide icons so every component references glyphs the same way.
    Requires the Lucide UMD script to be loaded on the page. */
export function Icon({ name, size = 20, strokeWidth = 1.75, color = 'currentColor', style = {}, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    let tries = 0;
    const run = () => {
      if (!(window.lucide && window.lucide.createIcons)) {
        if (tries++ < 30) setTimeout(run, 80);
        return;
      }
      window.lucide.createIcons();
      const svg = ref.current && ref.current.querySelector('svg');
      if (svg) {
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.style.strokeWidth = strokeWidth;
      }
    };
    run();
  }, [name, size, strokeWidth]);
  return (
    <span ref={ref} style={{ display: 'inline-flex', width: size, height: size, color, ...style }} {...rest}>
      <i data-lucide={name} style={{ width: size, height: size }}></i>
    </span>
  );
}
