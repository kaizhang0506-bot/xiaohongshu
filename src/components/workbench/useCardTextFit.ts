'use client';

import { useLayoutEffect, useRef } from 'react';
import { CARD_TEXT_SCALE } from '@/lib/card-rich-text';

/** Fit real text to nested template viewports without scaling images or device frames. */
export function useCardTextFit(identity: string, preferredScale: number, contentKind: 'cover' | 'section' | 'end') {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    let cancelled = false;
    const nodes = [...root.querySelectorAll<HTMLElement>('h1,h2,h3,p,li')];
    const paragraphs = nodes.filter(node => node.matches('p,li') && !node.hasAttribute('data-native-tag'));
    const bodyNode = paragraphs.filter(node => node.dataset.textRole === 'paragraph').sort((a, b) => (b.textContent?.length ?? 0) - (a.textContent?.length ?? 0))[0]
      ?? paragraphs.sort((a, b) => (b.textContent?.length ?? 0) - (a.textContent?.length ?? 0))[0];
    const bodyContainer = bodyNode?.closest<HTMLElement>('[data-card-rich-text]');
    const bodySize = bodyNode ? parseFloat(getComputedStyle(bodyContainer ?? bodyNode).fontSize) : 40;
    const applied = new Map<HTMLElement, { fontSize: string; lineHeight: string }>();
    const originals = nodes.map(node => {
      const css = getComputedStyle(node);
      const originalSize = parseFloat(css.fontSize);
      const size = contentKind !== 'cover' && node.matches('h1,h2,h3')
        ? bodySize * (node.dataset.textRole === 'subheading' ? CARD_TEXT_SCALE.subheading : CARD_TEXT_SCALE.heading)
        : contentKind !== 'cover' && (node.dataset.textRole === 'emphasis' || node.dataset.textRole === 'paragraph') ? bodySize : originalSize;
      const lineHeight = parseFloat(css.lineHeight) / originalSize;
      return { node, fontSize: node.style.getPropertyValue('font-size'), fontPriority: node.style.getPropertyPriority('font-size'), line: node.style.getPropertyValue('line-height'), linePriority: node.style.getPropertyPriority('line-height'), size, lineHeight: Number.isFinite(lineHeight) ? lineHeight : 1.3 };
    });
    const overflowing = () => nodes.some(node => {
      if (!node.textContent?.trim() || !node.getClientRects().length) return false;
      const range = document.createRange();
      range.selectNodeContents(node);
      const bounds = range.getBoundingClientRect();
      // Preview cards are scaled, export cards are not. Keep the same one-pixel
      // tolerance in card coordinates so both choose the same font size.
      const rootBox = root.getBoundingClientRect();
      const toleranceX = root.offsetWidth ? rootBox.width / root.offsetWidth : 1;
      const toleranceY = root.offsetHeight ? rootBox.height / root.offsetHeight : 1;
      if (node.scrollWidth > node.clientWidth + 1) return true;
      for (let parent: HTMLElement | null = node; parent && root.contains(parent); parent = parent.parentElement) {
        const css = getComputedStyle(parent);
        if (parent !== root && !/(hidden|clip|auto|scroll)/.test(css.overflow + css.overflowY)) continue;
        const box = parent.getBoundingClientRect();
        if (bounds.top < box.top - toleranceY || bounds.bottom > box.bottom + toleranceY || bounds.right > box.right + toleranceX || bounds.left < box.left - toleranceX) return true;
      }
      return false;
    });
    const fit = () => {
      if (cancelled) return;
      let factor = preferredScale;
      const apply = () => originals.forEach(({ node, size, lineHeight }) => {
        node.style.setProperty('font-size', `${size * factor}px`, 'important');
        // Each template keeps its own title/body rhythm as text shrinks to fit.
        node.style.setProperty('line-height', String(lineHeight), 'important');
        applied.set(node, { fontSize: node.style.getPropertyValue('font-size'), lineHeight: node.style.getPropertyValue('line-height') });
      });
      apply();
      for (let pass = 0; pass < 18 && overflowing(); pass++) { factor *= 0.9; apply(); }
      root.dataset.textFit = overflowing() ? 'overflow' : 'ready';
    };
    fit();
    void document.fonts.ready.then(fit);
    return () => {
      cancelled = true;
      originals.forEach(({ node, fontSize, fontPriority, line, linePriority }) => {
        const last = applied.get(node);
        // React may already have committed a new authored style. Restore only
        // properties this pass still owns, never an old complete style attribute.
        if (last && node.style.getPropertyPriority('font-size') === 'important' && node.style.getPropertyValue('font-size') === last.fontSize) {
          if (fontSize) node.style.setProperty('font-size', fontSize, fontPriority);
          else node.style.removeProperty('font-size');
        }
        if (last && node.style.getPropertyPriority('line-height') === 'important' && node.style.getPropertyValue('line-height') === last.lineHeight) {
          if (line) node.style.setProperty('line-height', line, linePriority);
          else node.style.removeProperty('line-height');
        }
      });
    };
  }, [identity, preferredScale, contentKind]);
  return ref;
}
