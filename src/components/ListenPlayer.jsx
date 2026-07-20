import { useEffect, useRef, useState } from 'react';
import {
  createNarrator,
  loadSettings,
  loadVoices,
  saveSettings,
  ttsAvailable,
} from '../lib/tts.js';
import { record, flushNow } from '../lib/telemetry.js';

// The floating listen player. Opens on the first `algonow:listen` event
// (dispatched by the hero Listen button and the per-section play chips) and
// reads the page's narration script: the long-form spoken lesson, written for
// the ear, distinct from the tighter on-page text.
export default function ListenPlayer({ narration, listenMinutes }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | playing | paused
  const [fraction, setFraction] = useState(0);
  const [voices, setVoices] = useState([]);
  const [voiceURI, setVoiceURI] = useState('');
  const [rate, setRate] = useState(1);
  const [follow, setFollow] = useState(true);
  const narratorRef = useRef(null);
  const sectionRef = useRef('');
  const voicesRef = useRef([]);

  const highlight = (section) => {
    if (sectionRef.current === section) return;
    const prev = document.getElementById(`sec-${sectionRef.current}`);
    prev?.classList.remove('speaking-now');
    sectionRef.current = section;
    if (!section) return;
    const el = document.getElementById(`sec-${section}`);
    el?.classList.add('speaking-now');
  };

  const getNarrator = () => {
    if (!narratorRef.current) {
      narratorRef.current = createNarrator(narration, {
        onParagraph: (pi) => {
          const section = narration[pi]?.section || '';
          if (section !== sectionRef.current) {
            highlight(section);
            if (followRef.current) {
              document
                .getElementById(`sec-${section}`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        },
        onProgress: (spoken, total, delta) => {
          setFraction(total ? spoken / total : 0);
          if (delta > 0) record('progress', { chars: delta, voice: voiceLabel(), rate: rateRef.current });
        },
        onState: (s) => setPhase(s),
        onFinish: (completed) => {
          highlight('');
          record(completed ? 'complete' : 'stop', { voice: voiceLabel(), rate: rateRef.current });
        },
      });
    }
    return narratorRef.current;
  };

  // Refs shadow the pieces of state the narrator callbacks need without
  // re-creating the narrator.
  const followRef = useRef(follow);
  followRef.current = follow;
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const voiceLabel = () => {
    const v = voicesRef.current.find((x) => x.voiceURI === (narratorVoiceRef.current || ''));
    return v ? v.name : 'default';
  };
  const narratorVoiceRef = useRef('');

  useEffect(() => {
    if (!ttsAvailable()) return undefined;
    const settings = loadSettings();
    if (settings.rate) setRate(settings.rate);
    if (settings.follow === false) setFollow(false);
    loadVoices((list) => {
      setVoices(list);
      voicesRef.current = list;
      const wanted = list.find((v) => v.voiceURI === settings.voiceURI) || list[0] || null;
      if (wanted) {
        setVoiceURI(wanted.voiceURI);
        narratorVoiceRef.current = wanted.voiceURI;
        narratorRef.current?.setVoice(wanted);
      }
    });

    const onListen = (ev) => {
      const narrator = getNarrator();
      applyCurrentSettings(narrator);
      setOpen(true);
      const section = ev.detail?.section;
      const pi = section ? narration.findIndex((p) => p.section === section) : 0;
      narrator.playFrom(narrator.chunkForParagraph(Math.max(0, pi)));
      record('play', { voice: voiceLabel(), rate: rateRef.current });
    };
    window.addEventListener('algonow:listen', onListen);

    const onPageHide = () => {
      if (narratorRef.current?.isPlaying()) {
        record('stop', { voice: voiceLabel(), rate: rateRef.current });
        narratorRef.current.stop(true);
      }
      flushNow();
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('algonow:listen', onListen);
      window.removeEventListener('pagehide', onPageHide);
      narratorRef.current?.stop(true);
      highlight('');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyCurrentSettings = (narrator) => {
    const v = voicesRef.current.find((x) => x.voiceURI === narratorVoiceRef.current);
    if (v) narrator.setVoice(v);
    narrator.setRate(rateRef.current);
  };

  if (!open) return null;

  const narrator = narratorRef.current;
  const toggle = () => {
    if (!narrator) return;
    if (phase === 'playing') narrator.pause();
    else if (phase === 'paused') narrator.resume();
    else {
      applyCurrentSettings(narrator);
      narrator.playFrom(0);
      record('play', { voice: voiceLabel(), rate });
    }
  };

  const close = () => {
    if (narrator && (phase === 'playing' || phase === 'paused')) narrator.stop(false);
    highlight('');
    setOpen(false);
  };

  const minutesLeft = Math.max(1, Math.round((1 - fraction) * listenMinutes));

  return (
    <aside className="listen-player" role="region" aria-label="Listen player">
      <p className="lp-title">
        <b>listening</b>
        <span>{phase === 'idle' && fraction >= 1 ? 'finished' : `~${minutesLeft} min left`}</span>
      </p>
      <div className="lp-progress" aria-hidden="true">
        <i style={{ width: `${Math.round(fraction * 100)}%` }} />
      </div>
      <div className="lp-controls">
        <button type="button" className="btn btn-listen" onClick={toggle} aria-label={phase === 'playing' ? 'Pause narration' : 'Play narration'}>
          {phase === 'playing' ? '⏸ pause' : '▶ play'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (!narrator) return;
            applyCurrentSettings(narrator);
            narrator.playFrom(0);
            record('play', { voice: voiceLabel(), rate });
          }}
          aria-label="Restart narration"
        >
          ↺
        </button>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35em' }}>
          <input
            type="checkbox"
            checked={follow}
            onChange={(e) => {
              setFollow(e.target.checked);
              saveSettings({ ...loadSettings(), follow: e.target.checked });
            }}
            style={{ accentColor: 'var(--heur)' }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--ink-dim)' }}>follow</span>
        </label>
        <button type="button" className="lp-close" onClick={close} aria-label="Close listen player">
          ✕
        </button>
      </div>
      <div className="lp-settings">
        <label>
          voice{' '}
          <select
            value={voiceURI}
            onChange={(e) => {
              setVoiceURI(e.target.value);
              narratorVoiceRef.current = e.target.value;
              const v = voices.find((x) => x.voiceURI === e.target.value);
              if (v) narratorRef.current?.setVoice(v);
              saveSettings({ ...loadSettings(), voiceURI: e.target.value });
            }}
          >
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name.replace(/^Microsoft |^Google /, '')}
              </option>
            ))}
          </select>
        </label>
        <label style={{ flex: 1, display: 'inline-flex', alignItems: 'center', gap: '0.4em' }}>
          {rate.toFixed(2)}x
          <input
            type="range"
            min="0.75"
            max="1.4"
            step="0.05"
            value={rate}
            onChange={(e) => {
              const r = Number(e.target.value);
              setRate(r);
              narratorRef.current?.setRate(r);
              saveSettings({ ...loadSettings(), rate: r });
            }}
            aria-label="Narration speed"
          />
        </label>
      </div>
    </aside>
  );
}
