'use client';

import { useEffect, useState } from 'react';

const families = ['XHS Sans', 'XHS Serif', 'XHS WenKai', 'XHS KuaiLe', 'XHS Smiley'];

/** Development-only evidence that real webfont faces loaded, rather than a system fallback. */
export function FontLoadCheck() {
  const [loaded, setLoaded] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void Promise.all(families.map(async family => {
      const faces = await document.fonts.load(`400 32px "${family}"`, '财经学习笔记，文字排版');
      return faces.length > 0 && faces.every(face => face.status === 'loaded') ? family : '';
    })).then(results => {
      if (active) setLoaded(results.filter(Boolean));
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  return <p data-testid="font-load-check" data-font-status={failed ? 'error' : loaded.length === families.length ? 'ready' : 'loading'} style={{fontSize: 14, margin: '10px 0'}}>
    本地字体：{loaded.length} / {families.length} 已加载{failed ? '（加载失败）' : ''} · {loaded.join(' / ')}
  </p>;
}
