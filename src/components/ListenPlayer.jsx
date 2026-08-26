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
//
// Getting OUT is a first-class control here. A narration can run seven
// minutes, so pause and stop are the two largest things in the panel, the
// panel is fixed to the viewport and cannot be scrolled away from, and Escape
// stops the audio from anywhere on the page without the reader having to find
// the panel at all. Voice and speed hide behind a toggle so they never compete
// with the controls that make the sound go away.
//
// Everything here talks to the narrator interface (playFrom, pause, resume,
// stop, isPlaying) rather than to any particular speech engine, so replacing
// the engine underneath leaves these controls untouched.
export default function ListenPlayer({ narration, listenMinutes, nextPair }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | playing | paused
  const [fraction, setFraction] = useState(0);
  const [voices, setVoices] = useState([]);
  const [voiceURI, setVoiceURI] = useState('');
  const [rate, setRate] = useState(1);
  const [follow, setFollow] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const narratorRef = useRef(null);
  const sectionRef = useRef('');
  const voicesRef = useRef([]);
  const paragraphRef = useRef(0);

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
          paragraphRef.current = pi;
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
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
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

  // Escape silences the narration from anywhere on the page. This is the way
  // out for a reader who cannot find the panel, or who simply wants the sound
  // to stop right now and should not have to hunt for a button to get it.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      const narrator = narratorRef.current;
      if (!narrator) return;
      if (phaseRef.current === 'playing' || phaseRef.current === 'paused') {
        narrator.stop(false);
        highlight('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const applyCurrentSettings = (narrator) => {
    const v = voicesRef.current.find((x) => x.voiceURI === narratorVoiceRef.current);
    if (v) narrator.setVoice(v);
    narrator.setRate(rateRef.current);
  };

  if (!open) return null;

  const narrator = narratorRef.current;
  const playing = phase === 'playing';
  const live = playing || phase === 'paused';

  const toggle = () => {
    if (!narrator) return;
    if (playing) narrator.pause();
    else if (phase === 'paused') narrator.resume();
    else {
      applyCurrentSettings(narrator);
      narrator.playFrom(0);
      record('play', { voice: voiceLabel(), rate });
    }
  };

  // Stop silences and rewinds but leaves the panel up, so a reader who stopped
  // by reflex can start again without going back to find the Listen button.
  const stopNow = () => {
    if (!narrator || !live) return;
    narrator.stop(false);
    highlight('');
  };

  const restart = () => {
    if (!narrator) return;
    applyCurrentSettings(narrator);
    narrator.playFrom(0);
    record('play', { voice: voiceLabel(), rate });
  };

  // Paragraph skip: recover a missed sentence or jump ahead without
  // restarting a section from its heading chip. Small icons on purpose; stop
  // and pause stay the dominant controls per the panel's doctrine.
  const skipParagraph = (delta) => {
    if (!narrator || !live) return;
    const target = Math.max(0, Math.min(narration.length - 1, paragraphRef.current + delta));
    narrator.playFrom(narrator.chunkForParagraph(target));
  };

  const close = () => {
    if (narrator && live) narrator.stop(false);
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
      {phase === 'idle' && fraction >= 1 && nextPair && (
        <p className="lp-next">
          next: <a href={nextPair.path}>{nextPair.title} →</a>
        </p>
      )}
      <div className="lp-progress" aria-hidden="true">
        <i style={{ width: `${Math.round(fraction * 100)}%` }} />
      </div>
      <div className="lp-controls">
        <button
          type="button"
          className="btn btn-listen lp-primary"
          onClick={toggle}
          aria-label={playing ? 'Pause narration' : 'Play narration'}
        >
          {playing ? '⏸ pause' : '▶ play'}
        </button>
        <button
          type="button"
          className="btn lp-stop"
          onClick={stopNow}
          disabled={!live}
          aria-label="Stop narration"
        >
          ■ stop
        </button>
        <button
          type="button"
          className="btn lp-icon"
          onClick={() => skipParagraph(-1)}
          disabled={!live}
          aria-label="Back one paragraph"
          title="Back one paragraph"
        >
          ‹
        </button>
        <button
          type="button"
          className="btn lp-icon"
          onClick={() => skipParagraph(1)}
          disabled={!live}
          aria-label="Forward one paragraph"
          title="Forward one paragraph"
        >
          ›
        </button>
        <button
          type="button"
          className="btn lp-icon"
          onClick={restart}
          aria-label="Restart narration"
          title="Restart from the beginning"
        >
          ↺
        </button>
        <button
          type="button"
          className="btn lp-icon"
          onClick={() => setShowSettings((s) => !s)}
          aria-expanded={showSettings}
          aria-label="Voice and speed settings"
          title="Voice and speed"
        >
          ☰
        </button>
        <button type="button" className="lp-close" onClick={close} aria-label="Close listen player">
          ✕
        </button>
      </div>

      <p className="lp-hint">
        press <kbd>Esc</kbd> to stop the audio from anywhere on the page
      </p>

      {showSettings && (
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
          <label className="lp-rate">
            {rate.toFixed(2)}x
            <input
              type="range"
              min="0.75"
              max="2"
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
          <label className="lp-follow">
            <input
              type="checkbox"
              checked={follow}
              onChange={(e) => {
                setFollow(e.target.checked);
                saveSettings({ ...loadSettings(), follow: e.target.checked });
              }}
            />
            <span>scroll the page along</span>
          </label>
        </div>
      )}
    </aside>
  );
}
