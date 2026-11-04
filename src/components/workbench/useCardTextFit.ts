'use client';

import { useLayoutEffect, useRef } from 'react';

/** Fit real text to nested template viewports without scaling images or device frames. */
export function useCardTextFit(identity: string, preferredScale: number) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    let cancelled = false;
    const nodes = [...root.querySelectorAll<HTMLElement>('h1,h2,h3,p,li')];
    const originals = nodes.map(node => ({ node, style: node.getAttribute('style'), size: parseFloat(getComputedStyle(node).fontSize) }));
    const overflowing = () => nodes.some(node => {
      if (!node.textContent?.trim() || !node.getClientRects().length) return false;
      const range = document.createRange();
      range.selectNodeContents(node);
      const bounds = range.getBoundingClientRect();
      if (node.scrollWidth > node.clientWidth + 1) return true;
      for (let parent: HTMLElement | null = node; parent && root.contains(parent); parent = parent.parentElement) {
        const css = getComputedStyle(parent);
        if (parent !== root && !/(hidden|clip|auto|scroll)/.test(css.overflow + css.overflowY)) continue;
        const box = parent.getBoundingClientRect();
        if (bounds.bottom > box.bottom + 1 || bounds.right > box.right + 1 || bounds.left < box.left - 1) return true;
      }
      return false;
    });
    const fit = () => {
      if (cancelled) return;
      let factor = preferredScale;
      const apply = () => originals.forEach(({ node, size }) => {
        node.style.setProperty('font-size', `${size * factor}px`, 'important');
        node.style.setProperty('line-height', '1.3', 'important');
      });
      apply();
      for (let pass = 0; pass < 18 && overflowing(); pass++) { factor *= 0.9; apply(); }
      root.dataset.textFit = overflowing() ? 'overflow' : 'ready';
    };
    fit();
    void document.fonts.ready.then(fit);
    return () => {
      cancelled = true;
      originals.forEach(({ node, style }) => style === null ? node.removeAttribute('style') : node.setAttribute('style', style));
    };
  }, [identity, preferredScale]);
  return ref;
}
