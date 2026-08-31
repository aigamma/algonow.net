import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { mediaUrl } from '../config/media.js';
import { record, flushNow } from '../lib/telemetry.js';
import {
  DEFAULT_NARRATION_RATE,
  DEFAULT_NARRATION_VOICE,
  NARRATION_RATES,
  chooseNarrationVoice,
  clampMediaTime,
  formatNarrationRate,
  formatNarrationTime,
  mediaProgressRatio,
  narrationTimeValueText,
  seekBySeconds,
  timeAtProgressRatio,
  usableNarrationTracks,
  voiceDescription,
} from '../lib/preservedNarrationPlayer.js';

const PRESERVED_AUDIO_MODEL = 'chirp3-hd-preserved';

function mediaErrorMessage(mediaError) {
  switch (mediaError?.code) {
    case 1:
      return 'Narration loading was cancelled.';
    case 2:
      return 'The narration could not be downloaded. Check the connection and try again.';
    case 3:
      return 'The narration file could not be decoded by this browser.';
    case 4:
      return 'This browser cannot play the available narration format.';
    default:
      return 'The narration could not be played. Try again or choose the other voice.';
  }
}

function narrationCharacterCount(manifest, narration) {
  const sourceCharacters = Number(manifest?.source_characters);
  if (Number.isFinite(sourceCharacters) && sourceCharacters > 0) {
    return Math.round(sourceCharacters);
  }
  const configured = Number(manifest?.generated_characters);
  const voiceCount = Object.keys(manifest?.tracks || manifest?.recipe?.tracks || {}).length;
  if (Number.isFinite(configured) && configured > 0 && voiceCount > 0) {
    return Math.round(configured / voiceCount);
  }
  if (!Array.isArray(narration)) return 0;
  return narration.reduce((sum, entry) => sum + [...String(entry?.text || '')].length, 0);
}

export function NarrationTransport({
  label,
  manifest,
  narration,
  mediaBaseUrl,
  onClose,
}) {
  const tracks = useMemo(() => usableNarrationTracks(manifest), [manifest]);
  const initialVoice = chooseNarrationVoice(tracks, DEFAULT_NARRATION_VOICE);
  const initialRate = DEFAULT_NARRATION_RATE;

  const [voiceId, setVoiceId] = useState(initialVoice);
  const [rate, setRate] = useState(initialRate);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState(tracks.length ? 'loading' : 'error');
  const [error, setError] = useState(
    tracks.length ? '' : 'No playable narration track is configured.',
  );
  const [announcement, setAnnouncement] = useState('');

  const audioRef = useRef(null);
  const playButtonRef = useRef(null);
  const rateRef = useRef(rate);
  const pendingSwitchRef = useRef(null);
  const playAttemptRef = useRef(0);
  const seekingRef = useRef(false);
  const lastMediaTimeRef = useRef(0);
  const pendingCharactersRef = useRef(0);
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const activeVoiceRef = useRef(initialVoice || '');
  const totalCharacters = useMemo(
    () => narrationCharacterCount(manifest, narration),
    [manifest, narration],
  );

  rateRef.current = rate;

  const headingId = useId();
  const descriptionId = useId();
  const speedId = useId();

  useEffect(() => {
    const timer = window.setTimeout(() => playButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const activeTrack = useMemo(
    () => tracks.find((track) => track.id === voiceId) || tracks[0] || null,
    [tracks, voiceId],
  );
  activeVoiceRef.current = activeTrack?.id || '';
  const activeTrackUrl = activeTrack
    ? mediaUrl(activeTrack.objectKey, mediaBaseUrl)
    : '';
  const activeTrackIndex = activeTrack
    ? tracks.findIndex((track) => track.id === activeTrack.id)
    : -1;
  const alternateTrack = tracks.length > 1 && activeTrackIndex >= 0
    ? tracks[(activeTrackIndex + 1) % tracks.length]
    : null;

  const telemetryFields = useCallback((chars = 0) => ({
    chars,
    voice: activeVoiceRef.current,
    rate: rateRef.current,
    m: PRESERVED_AUDIO_MODEL,
  }), []);

  const flushProgressTelemetry = useCallback((force = false) => {
    const pending = Math.floor(pendingCharactersRef.current);
    if (pending <= 0 || (!force && pending < 500)) return;
    pendingCharactersRef.current -= pending;
    record('progress', telemetryFields(pending));
  }, [telemetryFields]);

  const accountForPlayback = useCallback((nextTime, knownDuration) => {
    const previous = lastMediaTimeRef.current;
    const deltaSeconds = nextTime - previous;
    lastMediaTimeRef.current = nextTime;
    if (
      !isPlaying
      || seekingRef.current
      || deltaSeconds <= 0
      || !Number.isFinite(knownDuration)
      || knownDuration <= 0
      || totalCharacters <= 0
    ) return;
    pendingCharactersRef.current += (deltaSeconds / knownDuration) * totalCharacters;
    flushProgressTelemetry(false);
  }, [flushProgressTelemetry, isPlaying, totalCharacters]);

  const attemptPlay = useCallback(async (audio) => {
    if (!audio) return false;
    const attemptId = ++playAttemptRef.current;
    setError('');
    setStatus('loading');
    try {
      audio.playbackRate = rateRef.current;
      audio.defaultPlaybackRate = rateRef.current;
      await audio.play();
      return true;
    } catch (playError) {
      if (attemptId !== playAttemptRef.current || playError?.name === 'AbortError') {
        return false;
      }
      setIsPlaying(false);
      setStatus('paused');
      setError('Playback did not start. Press Play to try again.');
      setAnnouncement('Playback did not start. Press Play to try again.');
      return false;
    }
  }, []);

  useEffect(() => {
    const valid = tracks.some((track) => track.id === voiceId);
    if (valid) return;
    setVoiceId(chooseNarrationVoice(tracks, DEFAULT_NARRATION_VOICE));
  }, [tracks, voiceId]);

  useEffect(() => {
    playAttemptRef.current += 1;
    const audio = audioRef.current;
    const pending = pendingSwitchRef.current;
    setError('');
    setIsReady(false);
    setIsPlaying(false);
    setDuration(activeTrack?.durationSeconds || 0);
    setCurrentTime(
      pending && activeTrack?.durationSeconds
        ? timeAtProgressRatio(pending.ratio, activeTrack.durationSeconds)
        : 0,
    );
    lastMediaTimeRef.current = 0;

    if (!audio || !activeTrackUrl) {
      setStatus('error');
      setError('No playable narration track is configured.');
      return;
    }

    setStatus(pending ? 'switching' : 'loading');
    try {
      audio.pause();
      audio.defaultPlaybackRate = rateRef.current;
      audio.playbackRate = rateRef.current;
      audio.load();
    } catch {
      setStatus('error');
      setError('The narration could not be loaded by this browser.');
    }
  }, [activeTrack?.durationSeconds, activeTrackUrl]);

  useEffect(() => () => {
    playAttemptRef.current += 1;
    const audio = audioRef.current;
    try {
      audio?.pause();
    } catch {
      // The media element may already have left the document.
    }
    flushProgressTelemetry(true);
    if (startedRef.current && !completedRef.current) {
      record('stop', telemetryFields());
    }
    flushNow();
  }, [flushProgressTelemetry, telemetryFields]);

  const handleLoadedMetadata = useCallback((event) => {
    const audio = event.currentTarget;
    const measuredDuration = Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
      : activeTrack?.durationSeconds || 0;
    audio.defaultPlaybackRate = rateRef.current;
    audio.playbackRate = rateRef.current;
    setDuration(measuredDuration);
    setIsReady(true);

    const pending = pendingSwitchRef.current;
    pendingSwitchRef.current = null;
    if (!pending) {
      setStatus('ready');
      return;
    }

    const target = timeAtProgressRatio(pending.ratio, measuredDuration);
    try {
      audio.currentTime = target;
    } catch {
      // Keep the browser's safe position if the source is not seekable yet.
    }
    setCurrentTime(target);
    lastMediaTimeRef.current = target;
    setStatus('ready');
    setAnnouncement(`Voice changed to ${voiceDescription(activeTrack)} at 1.25 times.`);
    if (pending.shouldResume) attemptPlay(audio);
  }, [activeTrack, attemptPlay]);

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrackUrl) return;

    if (!audio.paused) {
      playAttemptRef.current += 1;
      flushProgressTelemetry(true);
      audio.pause();
      return;
    }

    if (
      Number.isFinite(audio.duration)
      && audio.duration > 0
      && audio.currentTime >= audio.duration - 0.05
    ) {
      audio.currentTime = 0;
      setCurrentTime(0);
      lastMediaTimeRef.current = 0;
      completedRef.current = false;
    }
    attemptPlay(audio);
  }, [activeTrackUrl, attemptPlay, flushProgressTelemetry]);

  const handleSeekBy = useCallback((deltaSeconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    const knownDuration = Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
      : duration;
    const target = seekBySeconds(audio.currentTime, deltaSeconds, knownDuration);
    try {
      audio.currentTime = target;
      setCurrentTime(target);
      lastMediaTimeRef.current = target;
      setAnnouncement(
        deltaSeconds < 0 ? 'Rewound 15 seconds.' : 'Moved forward 15 seconds.',
      );
    } catch {
      setError('This narration source does not support seeking yet.');
    }
  }, [duration]);

  const handleRangeChange = useCallback((event) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = clampMediaTime(Number(event.target.value), duration);
    try {
      audio.currentTime = target;
      setCurrentTime(target);
      lastMediaTimeRef.current = target;
      setAnnouncement(`Narration position changed to ${formatNarrationTime(target)}.`);
    } catch {
      setError('This narration source does not support seeking yet.');
    }
  }, [duration]);

  const handleRateChange = useCallback((event) => {
    const nextRate = Number(event.target.value);
    if (!NARRATION_RATES.includes(nextRate)) return;
    rateRef.current = nextRate;
    setRate(nextRate);
    const audio = audioRef.current;
    if (audio) {
      audio.defaultPlaybackRate = nextRate;
      audio.playbackRate = nextRate;
    }
    setAnnouncement(`Playback speed changed to ${formatNarrationRate(nextRate)}.`);
  }, []);

  const handleVoiceToggle = useCallback(() => {
    if (!alternateTrack) return;
    const audio = audioRef.current;
    const knownDuration = audio && Number.isFinite(audio.duration) && audio.duration > 0
      ? audio.duration
      : duration;
    const position = audio ? audio.currentTime : currentTime;
    const shouldResume = Boolean(audio && !audio.paused && !audio.ended);
    flushProgressTelemetry(true);
    pendingSwitchRef.current = {
      ratio: mediaProgressRatio(position, knownDuration),
      shouldResume,
    };
    rateRef.current = DEFAULT_NARRATION_RATE;
    setRate(DEFAULT_NARRATION_RATE);
    setStatus('switching');
    setAnnouncement(`Loading ${voiceDescription(alternateTrack)} at 1.25 times.`);
    setVoiceId(alternateTrack.id);
  }, [alternateTrack, currentTime, duration, flushProgressTelemetry]);

  const handleRetry = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrackUrl) return;
    setError('');
    setStatus('loading');
    setAnnouncement('Retrying narration.');
    try {
      audio.load();
    } catch {
      setStatus('error');
      setError('The narration could not be loaded by this browser.');
    }
  }, [activeTrackUrl]);

  const hasDuration = Number.isFinite(duration) && duration > 0;
  const boundedCurrentTime = clampMediaTime(currentTime, duration);
  const isBusy = status === 'loading' || status === 'switching' || status === 'buffering';
  const atStart = boundedCurrentTime <= 0.05;
  const atEnd = hasDuration && boundedCurrentTime >= duration - 0.05;
  const displayStatus = error
    || (status === 'switching' ? `Loading ${voiceDescription(activeTrack, 'voice')}...` : '')
    || (status === 'buffering' ? 'Buffering narration...' : '')
    || (status === 'loading' ? 'Loading narration...' : '')
    || (status === 'ended' ? 'Narration complete.' : '')
    || (isPlaying ? `Playing with ${voiceDescription(activeTrack)}.` : 'Ready to play.');

  return (
    <aside
      className="listen-player preserved-listen-player"
      role="region"
      aria-labelledby={headingId}
      aria-describedby={descriptionId}
      aria-busy={isBusy}
    >
      <div className="plp-header">
        <div>
          <p id={headingId} className="plp-title">
            <span aria-hidden="true">▥</span> {label}
          </p>
          <p id={descriptionId} className="plp-description">
            AI-generated narration of this lesson. Audio begins only when you press Play.
          </p>
        </div>
        <div className="plp-header-actions">
          {alternateTrack ? (
            <button
              type="button"
              className="plp-control plp-voice"
              onClick={handleVoiceToggle}
              disabled={status === 'switching'}
              aria-label={`Current voice ${voiceDescription(activeTrack)}. Switch to ${voiceDescription(alternateTrack)}`}
              title={`Switch to ${voiceDescription(alternateTrack)}`}
            >
              <span aria-hidden="true">◖</span>
              <span>Voice: {voiceDescription(activeTrack)}</span>
            </button>
          ) : null}
          <button
            type="button"
            className="plp-close"
            onClick={onClose}
            aria-label="Close text narration"
            title="Close text narration"
          >
            ×
          </button>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={activeTrackUrl || undefined}
        preload="metadata"
        aria-hidden="true"
        onLoadStart={() => {
          setIsReady(false);
          setStatus(pendingSwitchRef.current ? 'switching' : 'loading');
        }}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={(event) => {
          const measured = event.currentTarget.duration;
          if (Number.isFinite(measured) && measured > 0) setDuration(measured);
        }}
        onTimeUpdate={(event) => {
          const next = event.currentTarget.currentTime;
          const knownDuration = event.currentTarget.duration || duration;
          accountForPlayback(next, knownDuration);
          setCurrentTime(next);
        }}
        onSeeking={() => {
          seekingRef.current = true;
        }}
        onSeeked={(event) => {
          seekingRef.current = false;
          lastMediaTimeRef.current = event.currentTarget.currentTime;
        }}
        onPlay={() => {
          startedRef.current = true;
          completedRef.current = false;
          lastMediaTimeRef.current = audioRef.current?.currentTime || 0;
          setIsPlaying(true);
          setStatus('playing');
          setError('');
          setAnnouncement('Narration playing.');
          record('play', telemetryFields());
        }}
        onPlaying={() => {
          setIsPlaying(true);
          setStatus('playing');
        }}
        onPause={(event) => {
          setIsPlaying(false);
          flushProgressTelemetry(true);
          if (event.currentTarget.ended || pendingSwitchRef.current) return;
          setStatus('paused');
          setAnnouncement('Narration paused.');
        }}
        onWaiting={(event) => {
          if (!event.currentTarget.paused) {
            setStatus('buffering');
            setAnnouncement('Narration buffering.');
          }
        }}
        onCanPlay={() => {
          setIsReady(true);
          if (!isPlaying && !pendingSwitchRef.current) setStatus('ready');
        }}
        onEnded={(event) => {
          const measuredDuration = Number.isFinite(event.currentTarget.duration)
            && event.currentTarget.duration > 0
            ? event.currentTarget.duration
            : duration;
          accountForPlayback(measuredDuration, measuredDuration);
          flushProgressTelemetry(true);
          completedRef.current = true;
          setIsPlaying(false);
          setCurrentTime(measuredDuration);
          setStatus('ended');
          setAnnouncement('Narration complete.');
          record('complete', telemetryFields());
        }}
        onError={(event) => {
          pendingSwitchRef.current = null;
          setIsPlaying(false);
          setIsReady(false);
          setStatus('error');
          setError(mediaErrorMessage(event.currentTarget.error));
        }}
      />

      <div className="plp-controls" role="group" aria-label="Narration playback controls">
        <button
          type="button"
          className="plp-control"
          onClick={() => handleSeekBy(-15)}
          disabled={!isReady || atStart}
          aria-label="Rewind 15 seconds"
          title="Rewind 15 seconds"
        >
          <span aria-hidden="true">↶</span><span className="plp-fifteen">15</span>
        </button>

        <button
          ref={playButtonRef}
          type="button"
          className={`plp-control plp-play ${isPlaying ? 'is-playing' : 'is-paused'}`}
          onClick={handlePlayPause}
          disabled={!activeTrackUrl || status === 'switching'}
          aria-label={isPlaying ? 'Pause narration' : 'Play narration'}
          title={isPlaying ? 'Pause narration' : 'Play narration'}
        >
          <span aria-hidden="true">{isPlaying ? 'Ⅱ' : '▶'}</span>
        </button>

        <button
          type="button"
          className="plp-control"
          onClick={() => handleSeekBy(15)}
          disabled={!isReady || !hasDuration || atEnd}
          aria-label="Forward 15 seconds"
          title="Forward 15 seconds"
        >
          <span aria-hidden="true">↷</span><span className="plp-fifteen">15</span>
        </button>

        <div className="plp-speed">
          <label htmlFor={speedId}>Speed</label>
          <select
            id={speedId}
            value={rate}
            onChange={handleRateChange}
            aria-label="Narration playback speed"
          >
            {NARRATION_RATES.map((option) => (
              <option key={option} value={option}>{formatNarrationRate(option)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="plp-position">
        <input
          type="range"
          min="0"
          max={hasDuration ? duration : 0}
          step="0.1"
          value={boundedCurrentTime}
          onChange={handleRangeChange}
          disabled={!isReady || !hasDuration}
          aria-label="Narration position"
          aria-valuetext={narrationTimeValueText(boundedCurrentTime, duration)}
        />
        <span>{formatNarrationTime(boundedCurrentTime)} / {formatNarrationTime(duration)}</span>
      </div>

      <div className="plp-status">
        {error ? (
          <div className="plp-error" role="alert">
            <span aria-hidden="true">!</span>
            <span>{error}</span>
            {activeTrackUrl ? (
              <button type="button" className="plp-control plp-retry" onClick={handleRetry}>
                Retry
              </button>
            ) : null}
          </div>
        ) : (
          <span>{displayStatus}</span>
        )}
      </div>

      <p className="plp-hint">Press <kbd>Esc</kbd> to stop and close narration.</p>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </aside>
  );
}

export default function PreservedListenPlayer({
  label = 'Listen to this lesson',
  listenMinutes,
  manifest,
  mediaBaseUrl,
  narration,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const disclosureRef = useRef(null);
  const panelId = useId();

  const close = useCallback(() => {
    setIsExpanded(false);
    window.setTimeout(() => disclosureRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!isExpanded) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close, isExpanded]);

  return (
    <>
      <button
        ref={disclosureRef}
        type="button"
        className="btn btn-listen narration-disclosure"
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onClick={() => {
          if (isExpanded) {
            close();
            return;
          }
          setIsExpanded(true);
        }}
      >
        <span aria-hidden="true">▥</span>
        <span>Text Narration</span>
        <span className="narration-disclosure-meta">2 voices · ~{listenMinutes} min</span>
        <span aria-hidden="true">{isExpanded ? '⌃' : '⌄'}</span>
      </button>

      <div id={panelId} className="narration-panel-mount" hidden={!isExpanded}>
        {isExpanded ? (
          <NarrationTransport
            label={label}
            manifest={manifest}
            narration={narration}
            mediaBaseUrl={mediaBaseUrl}
            onClose={close}
          />
        ) : null}
      </div>
    </>
  );
}
