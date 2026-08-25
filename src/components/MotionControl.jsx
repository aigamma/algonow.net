import { useEffect, useRef, useState } from 'react';
import { MOTION_LEVELS, applyAttr, getLevelKey, setLevel } from '../lib/motion.js';

function MotionGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M2 4h12" />
        <path d="M2 8h8" />
        <path d="M2 12h4" />
      </g>
    </svg>
  );
}

// Animation speed, available from every page. The figures on this site loop,
// and looping motion is exactly what a reader with vestibular sensitivity
// needs to be able to turn down or switch off. The calm setting is the
// default, so this control is for turning the motion UP as much as down.
export default function MotionControl() {
  const [open, setOpen] = useState(false);
  // Start on the documented default so server-rendered and first client markup
  // agree, then adopt the reader's real preference once mounted.
  const [levelKey, setLevelKey] = useState('very-slow');
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    applyAttr();
    setLevelKey(getLevelKey());
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const current = MOTION_LEVELS.find((l) => l.key === levelKey) || MOTION_LEVELS[1];

  const choose = (key) => {
    setLevel(key);
    setLevelKey(key);
  };

  return (
    <div className="motion-ctl" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="motion-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
      >
        <MotionGlyph />
        <span className="motion-trigger-label">motion: {current.label}</span>
        <span className="motion-trigger-short" aria-hidden="true">motion</span>
      </button>

      {open && (
        <div className="motion-panel" role="dialog" aria-label="Animation speed">
          <p className="motion-panel-head">animation speed</p>
          <div className="motion-opts" role="group" aria-label="Animation speed">
            {MOTION_LEVELS.map((l) => (
              <button
                key={l.key}
                type="button"
                className={`motion-opt${l.key === levelKey ? ' is-on' : ''}`}
                aria-pressed={l.key === levelKey}
                onClick={() => choose(l.key)}
              >
                <span className="motion-opt-name">{l.label}</span>
                <span className="motion-opt-hint">{l.hint}</span>
              </button>
            ))}
          </div>
          <p className="motion-panel-note">
            Saved on this device. Figures also stop while scrolled out of view, and each one
            has its own restart button.
          </p>
        </div>
      )}
    </div>
  );
}
