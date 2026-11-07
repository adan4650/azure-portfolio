import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './vault-intro.css';

type VaultIntroProps = { onComplete: () => void };

const OUTLINE = '#090a12';
const INITIAL_ZOOM = 0.64;
const INITIAL_CAMERA = `translate(720 450) scale(${INITIAL_ZOOM}) translate(-720 -450)`;
const SKIN = { base: '#bd824f', highlight: '#dda36a', shadow: '#935c39', crease: '#663d29' };
const ZIP_HAND_SHAPE = 'M33 30q5-12-4-21L17-3Q9-11 3-4L-8 6q-14-2-17 9-1 9 12 13l4-3-5 18q0 13 10 12l12-21q-2 17 8 17l12-14Z';
const GRIP_HAND_SHAPE = 'M-7-12C-21-20-36-9-40 6L-45 27Q-47 40-33 46L-17 46Q-5 42-5 28L4 18Q13 8 6 1L-5 7-13 18-13 3Q0 3 2-4Q2-11-7-12Z';
const GRIP_THUMB_SHAPE = 'M-13 1Q-3-4 5 1Q11 7 5 13L-8 23Q-17 27-19 19Z';

function setPathGeometry(path: SVGPathElement | null | undefined, geometry: string) {
  if (!path) return;
  path.setAttribute('d', geometry);
  // Keep the SVG presentation attribute and CSS geometry in sync.
  path.style.setProperty('d', `path("${geometry}")`);
}

function drawSleeve(
  sleeve: SVGPathElement,
  seams: SVGPathElement[],
  cuff: SVGPathElement,
  wrist: { x: number; y: number },
  elbow: { x: number; y: number },
  shoulder?: { x: number; y: number },
  elbowSeams?: SVGPathElement,
) {
  const dx = elbow.x - wrist.x;
  const dy = elbow.y - wrist.y;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const nx = -uy * 25;
  const ny = ux * 25;
  const mx = (wrist.x + elbow.x) / 2;
  const my = (wrist.y + elbow.y) / 2;
  if (shoulder) {
    // A single outline turns out around the elbow and returns to the wrist, without an overlapping cap.
    const upperLength = Math.hypot(elbow.x - shoulder.x, elbow.y - shoulder.y);
    const ax = (elbow.x - shoulder.x) / upperLength;
    const ay = (elbow.y - shoulder.y) / upperLength;
    const an = { x: -ay * 25, y: ax * 25 };
    const fn = { x: -nx, y: -ny };
    const denominator = 1 + (an.x * fn.x + an.y * fn.y) / 625;
    const inner = { x: elbow.x + (an.x + fn.x) / denominator, y: elbow.y + (an.y + fn.y) / denominator };
    const innerFore = { x: inner.x - ux * 10, y: inner.y - uy * 10 };
    const innerUpper = { x: inner.x - ax * 10, y: inner.y - ay * 10 };
    setPathGeometry(sleeve, `M${shoulder.x - an.x} ${shoulder.y - an.y}L${elbow.x - an.x} ${elbow.y - an.y}A25 25 0 0 1 ${elbow.x - fn.x} ${elbow.y - fn.y}Q${mx - fn.x * 1.12} ${my - fn.y * 1.12} ${wrist.x - fn.x} ${wrist.y - fn.y}Q${wrist.x - ux * 8} ${wrist.y - uy * 8} ${wrist.x + fn.x} ${wrist.y + fn.y}Q${(wrist.x + fn.x + innerFore.x) / 2} ${(wrist.y + fn.y + innerFore.y) / 2} ${innerFore.x} ${innerFore.y}Q${inner.x} ${inner.y} ${innerUpper.x} ${innerUpper.y}L${shoulder.x + an.x} ${shoulder.y + an.y}Q${shoulder.x - ax * 10} ${shoulder.y - ay * 10} ${shoulder.x - an.x} ${shoulder.y - an.y}Z`);
    const stitches = [0.22, 0.44].map(fraction => {
      const sx = shoulder.x + (elbow.x - shoulder.x) * fraction;
      const sy = shoulder.y + (elbow.y - shoulder.y) * fraction;
      return `M${sx - an.x} ${sy - an.y}Q${sx + ax * 5} ${sy + ay * 5} ${sx + an.x} ${sy + an.y}`;
    }).join('');
    setPathGeometry(elbowSeams, `${stitches}M${elbow.x + an.x * 0.55} ${elbow.y + an.y * 0.55}Q${elbow.x + (an.x + fn.x) * 0.32} ${elbow.y + (an.y + fn.y) * 0.32} ${elbow.x + fn.x * 0.55} ${elbow.y + fn.y * 0.55}`);
  } else {
    setPathGeometry(sleeve, `M${wrist.x + nx} ${wrist.y + ny}Q${mx + nx * 1.15} ${my + ny * 1.15} ${elbow.x + nx} ${elbow.y + ny}Q${elbow.x + ux * 24} ${elbow.y + uy * 24} ${elbow.x - nx} ${elbow.y - ny}Q${mx - nx * 1.15} ${my - ny * 1.15} ${wrist.x - nx} ${wrist.y - ny}Q${wrist.x - ux * 8} ${wrist.y - uy * 8} ${wrist.x + nx} ${wrist.y + ny}Z`);
  }
  seams.forEach((seam, index) => {
    const fraction = (index + 1) / 4;
    const sx = wrist.x + dx * fraction;
    const sy = wrist.y + dy * fraction;
    setPathGeometry(seam, `M${sx + nx} ${sy + ny}Q${sx + ux * 8} ${sy + uy * 8} ${sx - nx} ${sy - ny}`);
  });
  setPathGeometry(cuff, `M${wrist.x + nx - ux * 4} ${wrist.y + ny - uy * 4}L${wrist.x - nx - ux * 4} ${wrist.y - ny - uy * 4}L${wrist.x - nx + ux * 18} ${wrist.y - ny + uy * 18}L${wrist.x + nx + ux * 18} ${wrist.y + ny + uy * 18}Z`);
}

function zipTrackAtHeight(progress: number, leftSpread: number, height: number) {
  if (-244 + 267 * progress <= height) return { x: 0, y: height };
  const target = (height + 244) / progress;
  const lowerCurve = target >= 109;
  const ys = lowerCurve ? [109, 170, 233, 267] : [0, 0, 54, 109];
  const xs = lowerCurve ? [-1, -1, -0.59, 0] : [0, -0.62, -1, -1];
  const at = (values: number[], u: number) => {
    const v = 1 - u;
    return values[0] * v * v * v + 3 * values[1] * v * v * u + 3 * values[2] * v * u * u + values[3] * u * u * u;
  };
  let low = 0;
  let high = 1;
  for (let index = 0; index < 24; index++) {
    const middle = (low + high) / 2;
    if (at(ys, middle) < target) low = middle;
    else high = middle;
  }
  return { x: at(xs, (low + high) / 2) * leftSpread, y: height };
}

const smokeWisps = [
  { x: 969, y: 568, scale: 0.47, direction: 1, lift: 125, drift: 78, delay: 0.9, duration: 3.65, strength: 0.43, depth: 'front' },
  { x: 914, y: 706, scale: 0.78, direction: 1, lift: 112, drift: 118, delay: 1.15, duration: 4.2, strength: 0.49, depth: 'front' },
  { x: 616, y: 729, scale: 0.83, direction: -1, lift: 82, drift: 147, delay: 1.6, duration: 4.1, strength: 0.42, depth: 'front' },
  { x: 816, y: 688, scale: 0.7, direction: 1, lift: 154, drift: 61, delay: 1.95, duration: 3.85, strength: 0.31, depth: 'back' },
  { x: 487, y: 748, scale: 0.8, direction: -1, lift: 76, drift: 127, delay: 2.3, duration: 3.4, strength: 0.38, depth: 'front' },
  { x: 1005, y: 742, scale: 0.91, direction: 1, lift: 116, drift: 116, delay: 2.65, duration: 3.15, strength: 0.46, depth: 'front' },
  { x: 703, y: 731, scale: 0.74, direction: -1, lift: 124, drift: 69, delay: 2.9, duration: 2.85, strength: 0.28, depth: 'back' },
  { x: 946, y: 654, scale: 0.65, direction: 1, lift: 145, drift: 83, delay: 1.45, duration: 4.1, strength: 0.3, depth: 'back' },
];

function SmokeWisp({ index, id }: { index: number; id: string }) {
  const wisp = smokeWisps[index];
  return (
    <g data-smoke={index} opacity="0" style={{ display: 'none' }} transform={`translate(${wisp.x} ${wisp.y}) scale(${wisp.scale})`}>
      <g filter={`url(#${id}-smoke-softness)`}>
        <ellipse data-smoke-base cx="0" cy="22" rx="139" ry="31" fill={`url(#${id}-smoke-body)`} />
        <path data-smoke-veil d="M-135 32C-92 42-65 8-80-30C-116-78-60-137-11-113C48-85 28-28 78-11C111-1 144-21 153-3C117 38 51 28 15 17C-34 1-79 62-135 32Z" fill={`url(#${id}-smoke-body)`} />
        <path data-smoke-thread d="M-137 20C-87 38-40 4-68-45S-84-124-18-133S69-104 31-56S64 8 138-22" fill="none" stroke={`url(#${id}-smoke-thread)`} strokeWidth="27" strokeLinecap="round" />
        <path data-smoke-fine d="M-126 27C-66 48-22 5 22 14S104 43 157-1" fill="none" stroke={`url(#${id}-smoke-thread)`} strokeWidth="13" strokeLinecap="round" opacity=".57" />
      </g>
    </g>
  );
}

function MetalBolt({ x, y, radius = 7 }: { x: number; y: number; radius?: number }) {
  const points = Array.from({ length: 6 }, (_, index) => {
    const angle = index * Math.PI / 3;
    return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`;
  }).join(' ');
  return <g transform={`translate(${x} ${y})`} strokeWidth="2.2"><polygon points={points} fill="#929795" /><circle r={radius * 0.32} fill="#40474f" strokeWidth="1.5" /><path d={`M${-radius * 0.5} ${-radius * 0.5}h${radius * 0.7}`} fill="none" stroke="#d0cdb8" strokeWidth="1.5" /></g>;
}

function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M4 9h4l5-4v14l-5-4H4Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      {muted ? <path d="m17 9 5 6m0-6-5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /> : <path d="M17 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
    </svg>
  );
}

export default function VaultIntro({ onComplete }: VaultIntroProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const frameRef = useRef<number | null>(null);
  const lightFrameRef = useRef<number | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const releaseScrollRef = useRef<(() => void) | null>(null);
  const gutterColorRef = useRef<string | null>(null);
  const completeRef = useRef(onComplete);
  const startedRef = useRef(false);
  const finishedRef = useRef(false);
  const mutedRef = useRef(false);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [portrait, setPortrait] = useState(() => window.matchMedia('(max-aspect-ratio: 4/5)').matches);
  const id = useId().replace(/:/g, '');
  completeRef.current = onComplete;

  const stopClock = useCallback(() => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    if (lightFrameRef.current !== null) window.cancelAnimationFrame(lightFrameRef.current);
    if (deadlineRef.current !== null) window.clearTimeout(deadlineRef.current);
    frameRef.current = null;
    lightFrameRef.current = null;
    deadlineRef.current = null;
  }, []);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.volume = 0;
    audio.currentTime = 0;
  }, []);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    stopClock();
    timelineRef.current?.kill();
    timelineRef.current = null;
    stopAudio();
    releaseScrollRef.current?.();
    completeRef.current();
  }, [stopAudio, stopClock]);

  useLayoutEffect(() => {
    const bodyStyle = document.body.style;
    const rootStyle = document.documentElement.style;
    const previousGutter = rootStyle.getPropertyValue('--vault-intro-gutter');
    const previousGutterPriority = rootStyle.getPropertyPriority('--vault-intro-gutter');
    gutterColorRef.current = 'rgb(0, 0, 0)';
    rootStyle.setProperty('--vault-intro-gutter', gutterColorRef.current);
    const previousOverflow = bodyStyle.getPropertyValue('overflow');
    const previousPriority = bodyStyle.getPropertyPriority('overflow');
    const previousAxes = ['overflow-x', 'overflow-y'].map(property => ({
      property,
      value: bodyStyle.getPropertyValue(property),
      priority: bodyStyle.getPropertyPriority(property),
    }));
    let released = false;
    // The root's stable scrollbar gutter preserves page width without artificial body padding.
    bodyStyle.setProperty('overflow', 'hidden', previousPriority);
    const releaseScroll = () => {
      if (released) return;
      released = true;
      // Preserve another owner's later change, and restore the exact prior inline style.
      if (bodyStyle.getPropertyValue('overflow') === 'hidden' && bodyStyle.getPropertyPriority('overflow') === previousPriority) {
        if (previousOverflow) bodyStyle.setProperty('overflow', previousOverflow, previousPriority);
        else {
          bodyStyle.removeProperty('overflow');
          previousAxes.forEach(({ property, value, priority }) => {
            if (value) bodyStyle.setProperty(property, value, priority);
          });
        }
      }
      if (releaseScrollRef.current === releaseScroll) releaseScrollRef.current = null;
    };
    releaseScrollRef.current = releaseScroll;
    return () => {
      releaseScroll();
      if (rootStyle.getPropertyValue('--vault-intro-gutter') === gutterColorRef.current) {
        if (previousGutter) rootStyle.setProperty('--vault-intro-gutter', previousGutter, previousGutterPriority);
        else rootStyle.removeProperty('--vault-intro-gutter');
      }
      gutterColorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const portraitQuery = window.matchMedia('(max-aspect-ratio: 4/5)');
    const portraitChanged = () => setPortrait(portraitQuery.matches);
    portraitQuery.addEventListener('change', portraitChanged);
    if (audioRef.current) audioRef.current.volume = 0;

    const root = rootRef.current;
    const lamp = root?.querySelector<SVGGElement>('[data-lamp]');
    const cone = root?.querySelector<SVGPathElement>('[data-light-cone]');
    const core = root?.querySelector<SVGPathElement>('[data-light-core]');
    const pool = root?.querySelector<SVGGElement>('[data-light-pool]');
    const surfaceWashes = root?.querySelectorAll<SVGRectElement>('[data-light-wash]');
    const lightStartedAt = performance.now();
    let lightActive = true;
    const drawLight = (now: number) => {
      if (!lightActive || finishedRef.current) return;
      const angle = Math.sin((now - lightStartedAt) / 7200 * Math.PI * 2) * 6.5;
      const radians = angle * Math.PI / 180;
      const rotate = (x: number, y: number) => ({
        x: 720 + (x - 720) * Math.cos(radians) - (y + 170) * Math.sin(radians),
        y: -170 + (x - 720) * Math.sin(radians) + (y + 170) * Math.cos(radians),
      });
      const left = rotate(650, -58);
      const right = rotate(790, -58);
      const innerLeft = rotate(696, -42);
      const innerRight = rotate(744, -42);
      const poolX = 720 - Math.tan(radians) * (769 + 170);
      const surfaceShift = -Math.tan(radians) * (425 + 170);
      lamp?.setAttribute('transform', `rotate(${angle} 720 -170)`);
      setPathGeometry(cone, `M${left.x} ${left.y} ${poolX - 390} 779q390 152 780 0L${right.x} ${right.y}Z`);
      setPathGeometry(core, `M${innerLeft.x} ${innerLeft.y} ${poolX - 269} 759q269 91 538 0L${innerRight.x} ${innerRight.y}Z`);
      pool?.setAttribute('transform', `translate(${poolX - 720} 0)`);
      surfaceWashes?.forEach(wash => wash.setAttribute('transform', `translate(${surfaceShift} 0)`));
      lightFrameRef.current = window.requestAnimationFrame(drawLight);
    };
    // This silent pendulum is intentional for every visitor; the explicit Skip control is always available.
    drawLight(lightStartedAt);
    return () => {
      lightActive = false;
      portraitQuery.removeEventListener('change', portraitChanged);
      timelineRef.current?.kill();
      timelineRef.current = null;
      stopClock();
      stopAudio();
    };
  }, [stopAudio, stopClock]);

  const toggleSound = () => {
    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    setMuted(nextMuted);
    const audio = audioRef.current;
    if (audio) {
      audio.muted = nextMuted;
      if (!nextMuted && startedRef.current && !finishedRef.current && audio.paused) {
        void audio.play().catch(() => { /* The visual entrance remains available if media is blocked. */ });
      }
    }
  };

  const startIntro = () => {
    if (startedRef.current || finishedRef.current) return;
    const root = rootRef.current;
    if (!root) return;
    startedRef.current = true;
    setStarted(true);
    const startedAt = performance.now();

    // Audio and the visual clock begin in the same visitor gesture.
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.volume = 0;
      audio.muted = mutedRef.current;
      void audio.play().catch(() => { /* A rejected play promise never blocks entry. */ });
    }

    const find = <T extends Element,>(selector: string) => root.querySelector<T>(selector)!;
    const camera = find<SVGGElement>('[data-camera]');
    const portalCamera = find<SVGGElement>('[data-portal-camera]');
    const portalCharacter = find<SVGGElement>('[data-portal-character]');
    const portalOpening = find<SVGPathElement>('[data-portal-opening]');
    const portalZipHand = find<SVGGElement>('[data-portal-zip-hand]');
    const portalGripHand = find<SVGGElement>('[data-portal-grip-hand]');
    const portalZipCuff = find<SVGPathElement>('[data-portal-zip-cuff]');
    const portalGripCuff = find<SVGPathElement>('[data-portal-grip-cuff]');
    const portalRimLeft = find<SVGPathElement>('[data-portal-rim-left]');
    const portalRimRight = find<SVGPathElement>('[data-portal-rim-right]');
    const door = find<SVGGElement>('[data-door]');
    const wheel = find<SVGGElement>('[data-wheel]');
    const character = find<SVGGElement>('[data-character]');
    const characterLight = Array.from(root.querySelectorAll<SVGElement>('[data-character-light]'));
    const leftLeg = find<SVGGElement>('[data-leg-left]');
    const rightLeg = find<SVGGElement>('[data-leg-right]');
    const opening = find<SVGPathElement>('[data-opening]');
    const zipperLeft = find<SVGPathElement>('[data-zip-left]');
    const zipperRight = find<SVGPathElement>('[data-zip-right]');
    const pullingHand = find<SVGGElement>('[data-pulling-hand]');
    const forearm = find<SVGPathElement>('[data-forearm]');
    const sleeveSeams = Array.from(root.querySelectorAll<SVGPathElement>('[data-sleeve-seam]'));
    const zipperCuff = find<SVGPathElement>('[data-zip-cuff]');
    const grippingHand = find<SVGGElement>('[data-gripping-hand]');
    const grippingForearm = find<SVGPathElement>('[data-gripping-forearm]');
    const grippingCuff = find<SVGPathElement>('[data-gripping-cuff]');
    const grippingSeams = Array.from(root.querySelectorAll<SVGPathElement>('[data-gripping-seam]'));
    const grippingElbowSeams = find<SVGPathElement>('[data-gripping-elbow-seams]');
    const hoodShell = find<SVGPathElement>('[data-hood-shell]');
    const hoodLeftQuilts = Array.from(root.querySelectorAll<SVGPathElement>('[data-hood-left-quilt]'));
    const hoodHighlight = find<SVGPathElement>('[data-hood-left-highlight]');
    const hoodTension = find<SVGPathElement>('[data-hood-tension]');
    const pull = find<SVGGElement>('[data-zip-pull]');
    const volume = { value: 0 };
    const doorState = { value: 0 };
    const wheelState = { angle: 0 };
    const walk = { value: 0 };
    const unzip = { value: 0 };
    const emergence = { value: 0 };
    const characterPose = { y: 435, scale: 0.58 };
    const timeline = gsap.timeline({ paused: true, onComplete: finish });
    timelineRef.current = timeline;

    timeline.to(volume, {
      value: 0.62, duration: 1.4, ease: 'power1.inOut',
      onUpdate: () => { if (audioRef.current) audioRef.current.volume = volume.value; },
    }, 0);
    timeline.to(wheelState, {
      angle: -142, duration: 0.75, ease: 'power2.inOut',
      onUpdate: () => wheel.setAttribute('transform', `rotate(${wheelState.angle} 720 425)`),
    }, 0);
    timeline.to(root.querySelectorAll('[data-lock-bolt]'), { x: -32, duration: 0.4, ease: 'power2.inOut' }, 0.35);
    timeline.to(root.querySelectorAll('[data-rod-upper]'), { y: 23, duration: 0.4, ease: 'power2.inOut' }, 0.35);
    timeline.to(root.querySelectorAll('[data-rod-lower]'), { y: -23, duration: 0.4, ease: 'power2.inOut' }, 0.35);
    timeline.to(doorState, {
      value: 1, duration: 6.1, ease: 'power1.inOut',
      onUpdate: () => door.setAttribute('transform', `translate(437 425) skewY(${-11 * doorState.value}) scale(${1 - 1.54 * doorState.value} 1) translate(-437 -425)`),
    }, 0.5);
    timeline.to(find<SVGElement>('[data-door-shadow]'), { opacity: 0, duration: 5.7 }, 0.8);

    smokeWisps.forEach((wisp, index) => {
      const node = find<SVGGElement>(`[data-smoke="${index}"]`);
      const veil = node.querySelector<SVGPathElement>('[data-smoke-veil]');
      const thread = node.querySelector<SVGPathElement>('[data-smoke-thread]');
      const fine = node.querySelector<SVGPathElement>('[data-smoke-fine]');
      const base = node.querySelector<SVGEllipseElement>('[data-smoke-base]');
      const state = { value: 0 };
      timeline.to(state, {
        value: 1, duration: wisp.duration, ease: 'none',
        onStart: () => { node.style.display = 'inline'; },
        onUpdate: () => {
          const t = state.value;
          const phase = index * 0.91;
          const curl = Math.sin(t * Math.PI * 2.2 + phase) * 17;
          const fold = Math.cos(t * Math.PI * 1.65 + phase) * 23;
          const x = wisp.x + wisp.direction * (t * wisp.drift + Math.sin(t * Math.PI) * 16);
          const y = wisp.y - t * wisp.lift + Math.sin(t * Math.PI * 2 + phase) * 5;
          const scaleX = wisp.scale * (0.48 + t * 1.09);
          const scaleY = wisp.scale * (0.62 + t * 0.62);
          const opacity = Math.min(1, t / 0.18) * Math.pow(1 - t, 0.85) * wisp.strength;
          node.setAttribute('transform', `translate(${x} ${y}) rotate(${wisp.direction * (t * 10 + curl * 0.23)}) scale(${scaleX} ${scaleY})`);
          node.setAttribute('opacity', `${opacity}`);
          setPathGeometry(veil, `M-135 32C-92 ${42 + curl * 0.3}-65 ${8 + fold * 0.5}-80 ${-30 + curl}C${-116 + fold} ${-78 - curl} ${-60 + curl} ${-137 - fold} ${-11 + curl * 0.5} ${-113 + curl}C${48 + fold} ${-85 + curl} ${28 - curl} ${-28 - fold} ${78 + fold * 0.3} ${-11 - curl}C111 ${-1 + fold} 144 ${-21 - curl} 153-3C117 38 51 ${28 + curl} 15 17C-34 ${1 + fold}-79 ${62 - curl}-135 32Z`);
          setPathGeometry(thread, `M-137 20C-87 ${38 + curl}-40 ${4 + fold}-68 ${-45 + curl}S${-84 + fold} ${-124 - curl} ${-18 + curl} ${-133 + fold}S${69 + curl} ${-104 + fold} ${31 + fold} ${-56 - curl}S${64 - curl} ${8 + fold} ${138 + curl} ${-22 + fold}`);
          setPathGeometry(fine, `M-126 27C-66 ${48 - fold}-22 ${5 + curl} 22 ${14 - curl}S104 ${43 + fold} ${157 - curl} ${-1 + fold}`);
          base?.setAttribute('transform', `translate(${curl * 0.5} ${fold * 0.2}) rotate(${curl * 0.4}) scale(${1 + t * 0.5} ${1 - t * 0.2})`);
        },
        // No filtered smoke survives the close hood push or the webpage aperture.
        onComplete: () => { node.setAttribute('opacity', '0'); node.style.display = 'none'; },
      }, wisp.delay);
    });

    timeline.to(emergence, {
      value: 1, duration: 4.05, ease: 'none',
      onUpdate: () => {
        const t = emergence.value;
        const light = 0.07 + 0.93 * t * t * (3 - 2 * t);
        character.setAttribute('opacity', `${Math.min(1, t * 1.7)}`);
        characterLight.forEach(channel => channel.setAttribute('slope', `${light}`));
      },
      onComplete: () => character.setAttribute('filter', 'none'),
    }, 1.95);
    timeline.to(walk, {
      value: 1, duration: 3.2, ease: 'none',
      onUpdate: () => {
        const t = walk.value;
        // Exactly two planted steps, with no lateral drift or looping gait.
        const leftPhase = Math.min(1, t * 2);
        const rightPhase = Math.max(0, t * 2 - 1);
        const leftLift = Math.sin(leftPhase * Math.PI);
        const rightLift = Math.sin(rightPhase * Math.PI);
        const depth = t * t * (3 - 2 * t);
        characterPose.y = 435 - (leftLift + rightLift) * 2.5;
        characterPose.scale = 0.58 + depth * 0.2;
        const transform = `translate(720 ${characterPose.y}) scale(${characterPose.scale})`;
        character.setAttribute('transform', transform);
        portalCharacter.setAttribute('transform', transform);
        leftLeg.setAttribute('transform', `translate(0 ${leftPhase * 8 - leftLift * 14}) rotate(${-leftLift * 3} -43 210)`);
        rightLeg.setAttribute('transform', `translate(0 ${rightPhase * 8 - rightLift * 14}) rotate(${rightLift * 3} 43 210)`);
      },
    }, 2.9);

    const drawUnzip = () => {
      const t = unzip.value;
      const y = -244 + 267 * t;
      const spread = 78 * Math.sin(t * Math.PI / 2);
      const sidePull = 18 * Math.sin(t * Math.PI / 2);
      const leftSpread = spread * (1 + 0.18 * t);
      const left = `M0 -244 C${-leftSpread * 0.62} -244 ${-leftSpread} ${-244 + 54 * t} ${-leftSpread} ${-244 + 109 * t} C${-leftSpread} ${y - 97 * t} ${-leftSpread * 0.59} ${y - 34 * t} 0 ${y}`;
      const right = `M0 -244 C${spread * 0.62} -244 ${spread} ${-244 + 54 * t} ${spread} ${-244 + 109 * t} C${spread} ${y - 97 * t} ${spread * 0.59} ${y - 34 * t} 0 ${y}`;
      const shape = `${left} ${right.replace('M0 -244', 'L0 -244')} Z`;
      setPathGeometry(opening, shape);
      setPathGeometry(portalOpening, shape);
      setPathGeometry(zipperLeft, left);
      setPathGeometry(zipperRight, right);
      setPathGeometry(portalRimLeft, left);
      setPathGeometry(portalRimRight, right);
      pull.setAttribute('transform', `translate(0 ${y})`);
      pullingHand.setAttribute('transform', `translate(8 ${y})`);
      portalZipHand.setAttribute('transform', `translate(8 ${y})`);

      // Hold the lower closed track, then follow its exact opened edge as the slider passes.
      const { x: gripX, y: gripY } = zipTrackAtHeight(t, leftSpread, -166);
      const gripAngle = 12 - t * 5;
      grippingHand.setAttribute('transform', `translate(${gripX} ${gripY}) rotate(${gripAngle})`);
      portalGripHand.setAttribute('transform', `translate(${gripX} ${gripY}) rotate(${gripAngle})`);
      const outerRimX = -111 - sidePull;
      setPathGeometry(hoodShell, `M0-253C-69-255 ${-110 - sidePull * 0.55}-196 ${outerRimX}-123C${-113 - sidePull}-58 ${-86 - sidePull * 0.68}-4 -42 28Q0 49 42 28C86-4 113-58 111-123C110-196 69-255 0-253Z`);
      const quiltPaths = [
        `M-9-244C-54-239 ${-89 - sidePull * 0.25}-210 ${-102 - sidePull * 0.55}-171`,
        `M${-109 - sidePull}-135Q${-61 - sidePull * 0.5}-161 -4-150`,
        `M${-104 - sidePull * 0.9}-86Q${-58 - sidePull * 0.45}-113 -4-102`,
        `M${-83 - sidePull * 0.7}-34Q${-48 - sidePull * 0.35}-53 -4-46`,
      ];
      hoodLeftQuilts.forEach((quilt, index) => setPathGeometry(quilt, quiltPaths[index]));
      setPathGeometry(hoodHighlight, `M-48-224Q${-84 - sidePull * 0.3}-197 ${-92 - sidePull * 0.55}-160`);
      const foldSpan = 8 + 16 * t;
      setPathGeometry(hoodTension, `M${gripX - 3} ${gripY - 4}Q${gripX - foldSpan * 0.6} ${gripY - 8} ${gripX - foldSpan} ${gripY - 5}M${gripX - 3} ${gripY + 5}Q${gripX - foldSpan * 0.6} ${gripY + 12} ${gripX - foldSpan} ${gripY + 10}`);
      hoodTension.setAttribute('opacity', `${0.25 + t * 0.75}`);

      // The zipper, optical approach, and page aperture share one continuous progress value.
      const cameraProgress = t * t * (3 - 2 * t);
      const zoom = INITIAL_ZOOM * Math.pow(27 / INITIAL_ZOOM, cameraProgress);
      const openingCenter = -244 + 125 * t;
      const hoodCenterY = characterPose.y + characterPose.scale * openingCenter;
      const focusProgress = Math.min(1, t / 0.72);
      const focusBlend = focusProgress * focusProgress * (3 - 2 * focusProgress);
      const focusY = 450 + (hoodCenterY - 450) * focusBlend;
      const cameraTransform = `translate(720 450) scale(${zoom}) translate(-720 ${-focusY})`;
      camera.setAttribute('transform', cameraTransform);
      portalCamera.setAttribute('transform', cameraTransform);
      const reveal = Math.max(0, Math.min(1, (t - 0.5) / 0.34));
      const aperture = reveal * reveal * reveal * (reveal * (reveal * 6 - 15) + 10);
      // Reveal through the actual zipper boundary; no second smaller page-shaped cutout.
      portalOpening.setAttribute('opacity', `${aperture}`);
      portalOpening.removeAttribute('transform');
      const gutterPhase = Math.max(0, Math.min(1, (t - 0.72) / 0.12));
      const gutterBlend = gutterPhase * gutterPhase * (3 - 2 * gutterPhase);
      gutterColorRef.current = `rgb(${Math.round(16 * gutterBlend)}, ${Math.round(6 * gutterBlend)}, ${Math.round(23 * gutterBlend)})`;
      document.documentElement.style.setProperty('--vault-intro-gutter', gutterColorRef.current);

      drawSleeve(forearm, sleeveSeams, zipperCuff, { x: 37, y: y + 34 }, { x: 136, y: 77 });
      const gripRadians = gripAngle * Math.PI / 180;
      drawSleeve(grippingForearm, grippingSeams, grippingCuff, {
        x: gripX - 22 * Math.cos(gripRadians) - 34 * Math.sin(gripRadians),
        y: gripY - 22 * Math.sin(gripRadians) + 34 * Math.cos(gripRadians),
      }, { x: -149, y: -6 }, { x: -82, y: 40 }, grippingElbowSeams);
      setPathGeometry(portalZipCuff, zipperCuff.getAttribute('d')!);
      setPathGeometry(portalGripCuff, grippingCuff.getAttribute('d')!);
    };
    drawUnzip();
    timeline.to(unzip, { value: 1, duration: 5.3, ease: 'none', onUpdate: drawUnzip }, 3.6);
    timeline.to(volume, {
      value: 0, duration: 0.45, ease: 'power1.in',
      onUpdate: () => { if (audioRef.current) audioRef.current.volume = volume.value; },
    }, 8.55);
    // Drive the playhead from elapsed time so a delayed browser frame cannot stretch the music/scene apart.
    const advance = () => {
      if (finishedRef.current) return;
      const elapsed = Math.min(9, (performance.now() - startedAt) / 1000);
      timeline.totalTime(elapsed, false);
      if (!finishedRef.current && elapsed < 9) frameRef.current = window.requestAnimationFrame(advance);
    };
    frameRef.current = window.requestAnimationFrame(advance);
    deadlineRef.current = window.setTimeout(() => {
      if (!finishedRef.current) timeline.totalTime(9, false);
    }, Math.max(0, 9000 - (performance.now() - startedAt)));
  };

  return (
    <div className={`vault-intro${started ? ' vault-intro--running' : ''}`} ref={rootRef} role="dialog" aria-modal="true" aria-label="The vault portfolio entrance">
      <audio ref={audioRef} src="/assets/vault-intro-audio.mp3?v=2" preload="auto" />
      <div className="vault-intro__topline" data-intro-ui>
        <div className="vault-intro__controls">
          <button type="button" className="vault-intro__sound" onClick={toggleSound} aria-label={muted ? 'Unmute intro music' : 'Mute intro music'} aria-pressed={muted}>
            <SoundIcon muted={muted} /><span>{muted ? 'Sound off' : 'Sound on'}</span>
          </button>
        </div>
      </div>

      <svg className="vault-intro__scene" viewBox={portrait ? '220 -200 1000 1400' : '0 0 1440 900'} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id={`${id}-smoke-body`} cx=".48" cy=".55" r=".57"><stop stopColor="#bbcbd5" stopOpacity=".44" /><stop offset=".43" stopColor="#9fb3c4" stopOpacity=".28" /><stop offset="1" stopColor="#748b9f" stopOpacity="0" /></radialGradient>
          <linearGradient id={`${id}-smoke-thread`} x1="0" y1="1" x2=".2" y2="0"><stop stopColor="#6e8499" stopOpacity="0" /><stop offset=".22" stopColor="#9cb2c5" stopOpacity=".27" /><stop offset=".63" stopColor="#c0d0db" stopOpacity=".48" /><stop offset="1" stopColor="#7d94a9" stopOpacity="0" /></linearGradient>
          <filter id={`${id}-smoke-softness`} filterUnits="userSpaceOnUse" x="-220" y="-220" width="440" height="340" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation="6.5" /></filter>
          <filter id={`${id}-character-emergence`} filterUnits="userSpaceOnUse" x="-200" y="-270" width="400" height="720" colorInterpolationFilters="sRGB"><feComponentTransfer><feFuncR data-character-light type="linear" slope=".07" /><feFuncG data-character-light type="linear" slope=".07" /><feFuncB data-character-light type="linear" slope=".07" /></feComponentTransfer></filter>
          <linearGradient id={`${id}-light-cone`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ecd6a0" stopOpacity=".14" /><stop offset=".7" stopColor="#d9c393" stopOpacity=".045" /><stop offset="1" stopColor="#d9c393" stopOpacity="0" /></linearGradient>
          <radialGradient id={`${id}-bulb-glow`}><stop stopColor="#ffdf8d" stopOpacity=".26" /><stop offset="1" stopColor="#ffdf8d" stopOpacity="0" /></radialGradient>
          <linearGradient id={`${id}-surface-light`}><stop stopColor="#fff0ba" stopOpacity="0" /><stop offset=".3" stopColor="#fff0ba" stopOpacity=".025" /><stop offset=".5" stopColor="#fff0ba" stopOpacity=".21" /><stop offset=".7" stopColor="#fff0ba" stopOpacity=".025" /><stop offset="1" stopColor="#fff0ba" stopOpacity="0" /></linearGradient>
          <clipPath id={`${id}-door-light`}><circle cx="720" cy="425" r="269" /></clipPath>
          <mask id={`${id}-rim-light`} maskUnits="userSpaceOnUse" x="410" y="115" width="620" height="620"><circle cx="720" cy="425" r="303" fill="#fff" /><circle cx="720" cy="425" r="272" fill="#000" /></mask>
          <mask id={`${id}-portal`} maskUnits="userSpaceOnUse" x="-1000" y="-1000" width="3440" height="3000" style={{ maskType: 'luminance' }}>
            <rect x="-1000" y="-1000" width="3440" height="3000" fill="#fff" />
            <g data-portal-camera transform={INITIAL_CAMERA}><g data-portal-character transform="translate(720 435) scale(.58)">
              <path data-portal-opening d="M0-244Z" fill="#000" opacity="0" />
              <path data-portal-rim-left d="M0-244Z" fill="none" stroke="#fff" strokeWidth="8" />
              <path data-portal-rim-right d="M0-244Z" fill="none" stroke="#fff" strokeWidth="8" />
              <path data-portal-zip-cuff d="M0 0" fill="#fff" stroke="#fff" strokeWidth="6" />
              <path data-portal-grip-cuff d="M0 0" fill="#fff" stroke="#fff" strokeWidth="6" />
              <g data-portal-zip-hand transform="translate(8 -244)"><path d={ZIP_HAND_SHAPE} fill="#fff" stroke="#fff" strokeWidth="6" /></g>
              <g data-portal-grip-hand transform="translate(0 -166) rotate(12)"><path d={GRIP_HAND_SHAPE} fill="#fff" stroke="#fff" strokeWidth="6" /><path d={GRIP_THUMB_SHAPE} fill="#fff" stroke="#fff" strokeWidth="6" /></g>
            </g></g>
          </mask>
        </defs>
        <g mask={`url(#${id}-portal)`}>
        <g data-camera transform={INITIAL_CAMERA}>
          <path fill="#000" d="M-6000-6000H8000V8000H-6000Z" />
          <path data-light-cone fill={`url(#${id}-light-cone)`} d="M650-58 330 779q390 152 780 0L790-58Z" />
          <path data-light-core fill="#f4d99b" opacity=".025" d="M696-42 451 759q269 91 538 0L744-42Z" />
          <g data-light-pool><ellipse cx="720" cy="769" rx="381" ry="58" fill="#c9b583" opacity=".09" /><ellipse cx="720" cy="767" rx="302" ry="36" fill="#d9c397" opacity=".075" /></g>
          <ellipse cx="720" cy="761" rx="334" ry="29" fill="#000" opacity=".9" />
          <g stroke={OUTLINE} strokeWidth="3"><path d="M706-170h28" stroke="#5a5b51" strokeWidth="5" /><circle cx="720" cy="-170" r="4" fill="#b3b09a" /></g>
          <g data-lamp stroke={OUTLINE} strokeWidth="4" strokeLinejoin="round">
            <path d="M720-170V-125" fill="none" stroke="#4a4b43" strokeWidth="8" />
            <path d="M718-170V-125" fill="none" stroke="#8e8c75" strokeWidth="2" />
            <rect x="702" y="-130" width="36" height="20" rx="5" fill="#5e6258" />
            <ellipse cx="720" cy="-52" rx="147" ry="78" fill={`url(#${id}-bulb-glow)`} stroke="none" />
            <path d="M600-62q17-47 104-51h32q87 4 104 51Z" fill="#42473f" />
            <path d="M619-77q20-26 76-29" fill="none" stroke="#92947b" strokeWidth="4" />
            <path d="M607-63h226" fill="none" stroke="#1c221e" strokeWidth="7" />
            <ellipse cx="720" cy="-62" rx="120" ry="12" fill="#b09a5d" />
            <path d="M703-61q-1 26 17 26t17-26" fill="#ffe6a0" strokeWidth="3" />
            <ellipse cx="720" cy="-62" rx="70" ry="6" fill="#e7cf87" stroke="none" />
          </g>
          <g stroke={OUTLINE} strokeWidth="6" strokeLinejoin="round">
            <path fill="#30353b" d="M405 741V423a315 315 0 0 1 630 0v318Z" />
            <path fill="#3e454a" d="M413 741V423a307 307 0 0 1 614 0v318Z" strokeWidth="3" />
            <circle cx="720" cy="425" r="303" fill="#717976" />
            <circle cx="720" cy="425" r="295" fill="#8c938b" strokeWidth="3" />
            <circle cx="720" cy="425" r="276" fill="#484f56" strokeWidth="4" />
            <circle cx="720" cy="425" r="265" fill="#252d35" strokeWidth="4" />
            <circle cx="720" cy="425" r="253" fill="#535d63" strokeWidth="3" />
            <circle cx="720" cy="425" r="244" fill="#000" />
            <path d="M435 389a288 288 0 0 1 486-174" fill="none" stroke="#c1beaa" strokeWidth="4" />
            <path d="M459 427a261 261 0 0 1 453-177" fill="none" stroke="#90978f" strokeWidth="3" />
            {Array.from({ length: 16 }, (_, index) => {
              const angle = (index * 22.5 - 90) * Math.PI / 180;
              return <MetalBolt key={index} x={720 + Math.cos(angle) * 286} y={425 + Math.sin(angle) * 286} radius={7.5} />;
            })}
            <path d="M414 741h612v21H414Z" fill="#616b70" />
            <path d="M431 744h578M435 752h570" stroke="#a8afa6" strokeWidth="2" />
            {[435, 1005].map(x => <g key={x}><MetalBolt x={x} y={700} radius={9} /><MetalBolt x={x} y={727} radius={9} /></g>)}
            <g mask={`url(#${id}-rim-light)`} pointerEvents="none"><rect data-light-wash x="470" y="105" width="500" height="660" fill={`url(#${id}-surface-light)`} stroke="none" /></g>
          </g>

          <g>{smokeWisps.map((wisp, index) => wisp.depth === 'back' ? <SmokeWisp key={index} index={index} id={id} /> : null)}</g>
          <g data-character opacity="0" filter={`url(#${id}-character-emergence)`} transform="translate(720 435) scale(.58)" stroke={OUTLINE} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="0" cy="407" rx="111" ry="19" fill="#05050a" stroke="none" opacity=".7" />
            <g data-leg-left>
              <path d="M-84 191-4 203l-16 109-23 75-58-5 13-89Z" fill="#20212a" />
              <path d="m-55 239 14 48-19 20m-26 30 26-10m-25 25 21-6" fill="none" stroke="#0a0b12" strokeWidth="4" />
              <path d="M-99 367q30-12 58 6l8 32q-22 20-78 7l-4-15Z" fill="#ededdf" />
              <path d="m-102 376 59 5 5 15-69-1Z" fill="#20222b" strokeWidth="3" />
              <path d="M-112 405q35 9 78-2v12q-33 13-80-1Z" fill="#aeb0ba" strokeWidth="3" />
              <path d="m-89 371 33 5m-36 5 36 5" fill="none" stroke="#edeee5" strokeWidth="4" />
            </g>
            <g data-leg-right>
              <path d="m-5 203 87-12 7 106 5 91-60 5-24-87Z" fill="#292a34" />
              <path d="m40 242-12 44 19 23m5 28 28 5m-24 10 23 6" fill="none" stroke="#0a0b12" strokeWidth="4" />
              <path d="M31 377q27-14 61-2l19 30q-25 20-82 8l-7-13Z" fill="#ededdf" />
              <path d="m32 384 61-1 11 14-74 3Z" fill="#20222b" strokeWidth="3" />
              <path d="M26 405q39 11 83-1l5 12q-40 14-87 1Z" fill="#aeb0ba" strokeWidth="3" />
              <path d="m44 376 35 1m-36 8 40 1" fill="none" stroke="#edeee5" strokeWidth="4" />
            </g>
            <path d="M-67 7q-39 11-44 52l14 146q87 30 192-1l16-144q-3-39-49-52Z" fill="#086bff" />
            <path d="M-97 57q47-16 97-5 53-13 99 5M-103 96q49-15 103-4 54-13 106 3M-100 137q51-14 100-3 49-14 102 2M-96 178q47-15 96-3 49-12 97 1" fill="none" stroke="#0a2c70" strokeWidth="4" />
            <path d="M-80 74q-12 38-8 72m164-76q12 37 10 73" fill="none" stroke="#438fff" strokeWidth="5" />
            <path d="m-75 155-8 32m157-32 8 32" fill="none" stroke="#07152f" strokeWidth="5" />
            <path d="M-95 202q93 26 190-1v16q-87 25-190-1Z" fill="#073fae" strokeWidth="4" />
            <path data-hood-shell d="M0-253C-69-255-110-196-111-123C-113-58-86-4-42 28Q0 49 42 28C86-4 113-58 111-123C110-196 69-255 0-253Z" fill="#086bff" />
            {['M-9-244C-54-239-89-210-102-171', 'M-109-135Q-61-161-4-150', 'M-104-86Q-58-113-4-102', 'M-83-34Q-48-53-4-46'].map((d, index) => <path data-hood-left-quilt key={index} d={d} fill="none" stroke="#092d79" strokeWidth="4" />)}
            <path d="M10-244c45 5 80 34 93 73M108-135q-48-26-105-15M104-86q-46-27-100-16M75-34q-35-19-79-12" fill="none" stroke="#092d79" strokeWidth="4" />
            <path data-hood-left-highlight d="M-48-224Q-84-197-92-160" fill="none" stroke="#4593ff" strokeWidth="5" />
            <path d="M51-224q34 27 41 64" fill="none" stroke="#4593ff" strokeWidth="5" />
            <path data-hood-tension d="M-104-132Q-88-146-12-145M-105-114Q-91-103-18-109" fill="none" stroke="#16417e" strokeWidth="3" opacity=".25" />
            <path d="M0-244V214" fill="none" stroke="#080b19" strokeWidth="11" />
            <path d="M0-244V214" fill="none" stroke="#d7dbe3" strokeWidth="5" strokeDasharray="3 4" />
            <path data-opening d="M0-244Z" fill="#000" stroke="#000" strokeWidth="8" />
            <path data-zip-left d="M0-244Z" fill="none" stroke="#d7dbe3" strokeWidth="5" strokeDasharray="3 4" />
            <path data-zip-right d="M0-244Z" fill="none" stroke="#d7dbe3" strokeWidth="5" strokeDasharray="3 4" />
            <path data-gripping-forearm d="M-53-147-6-128-130 13Q-155 25-174-19Z" fill="#116fff" />
            <path data-gripping-elbow-seams d="M0 0" fill="none" stroke="#092d79" strokeWidth="3.5" />
            {[0, 1, 2].map(index => <path data-gripping-seam key={index} d="M0 0" fill="none" stroke="#092d79" strokeWidth="4" />)}
            <path d="M82 25q39-9 71 27 30 31 7 54-26 17-51-11L80 63Z" fill="#086bff" />
            <path d="M122 34q-10 27-30 33m61-11q-12 28-36 37" fill="none" stroke="#092d79" strokeWidth="4" />
            <path data-forearm d="M8-215 52-229 160 71q10 40-35 35Z" fill="#116fff" />
            {[0, 1, 2].map(index => <path data-sleeve-seam key={index} d="M0 0" fill="none" stroke="#092d79" strokeWidth="4" />)}
            <path data-gripping-cuff d="M-158-91H-108V-69H-158Z" fill="#0841b5" strokeWidth="4" />
            <path data-zip-cuff d="m16-218 28 4 7 22-29 1Z" fill="#0841b5" strokeWidth="4" />
            <g data-zip-pull transform="translate(0 -244)" strokeWidth="3">
              <rect x="-6" y="-4" width="12" height="19" rx="4" fill="#c8cdd8" />
              <path d="M-4 9h8v16h-8Z" fill="#8e96a7" />
            </g>
            <g data-pulling-hand transform="translate(8 -244)" strokeWidth="4">
              <path d={ZIP_HAND_SHAPE} fill={SKIN.base} />
              <path d="M-13 29q-7 11 3 22 4 6 8-2L8 30q3 13 9 15l8-13q-13 7-38-3Z" fill={SKIN.shadow} stroke="none" />
              <path d="M-5 9Q2-2 10 4L22 14Q4 7-4 20Z" fill={SKIN.highlight} stroke="none" />
              <path d="M4 5q10-5 18 6M-9 25l10-9 13 4M5 35l8-13" fill="none" stroke={SKIN.crease} strokeWidth="3" />
            </g>
            <g data-gripping-hand transform="translate(0 -166) rotate(12)" strokeWidth="4">
              <path d={GRIP_HAND_SHAPE} fill={SKIN.base} />
              <path d="M-42 19q-2 17 12 22l14 1-2-10q-13 2-24-13Z" fill={SKIN.shadow} stroke="none" />
              <path d="M-33 1q7-12 21-9l5 7q-15-3-24 10Z" fill={SKIN.highlight} stroke="none" />
              <path d="M-9-5 1-1-2 14-12 11Z" fill="#438fff" strokeWidth="2.5" />
              <path d={GRIP_THUMB_SHAPE} fill={SKIN.base} strokeWidth="3" />
              <path d="M-32 6q9-4 16 0m-22 11q10-3 18 2m-20 9q9 0 17 4" fill="none" stroke={SKIN.crease} strokeWidth="2.5" />
              <path d="M-11 4q7-3 13 0" fill="none" stroke={SKIN.highlight} strokeWidth="3" />
            </g>
          </g>

          <g data-door-shadow><path d="M985 219q102 213-2 415" fill="none" stroke="#000" strokeWidth="28" opacity=".65" /></g>
          <g data-door stroke={OUTLINE} strokeWidth="6" strokeLinejoin="round">
            <circle cx="738" cy="425" r="269" fill="#262e37" />
            <path d="M996 370v110m-5-138v166m-6-192v218" fill="none" stroke="#657177" strokeWidth="3" />
            <circle cx="720" cy="425" r="270" fill="#7a8586" />
            <circle cx="720" cy="425" r="259" fill="#444e58" strokeWidth="3" />
            <circle cx="720" cy="425" r="250" fill="#969e95" strokeWidth="3" />
            <circle cx="720" cy="425" r="239" fill="#606d73" strokeWidth="4" />
            <path d="M481 425a239 239 0 0 0 478 0Z" fill="#505d66" stroke="none" />
            <path d="M720 188v142m0 190v142M484 425h140m192 0h140" fill="none" stroke="#303c48" strokeWidth="3" />
            <path d="M465 403a258 258 0 0 1 430-171M489 389q14-110 108-161" fill="none" stroke="#c7c7b1" strokeWidth="3" />
            <path d="M914 555q-52 87-164 99" fill="none" stroke="#737f82" strokeWidth="3" />
            {Array.from({ length: 12 }, (_, index) => {
              const angle = (index * 30 - 90) * Math.PI / 180;
              return <MetalBolt key={index} x={720 + Math.cos(angle) * 255} y={425 + Math.sin(angle) * 255} radius={7} />;
            })}
            <g strokeWidth="4">
              <path d="M792 393 879 330h53m-100 95h100m-140 32 87 63h53M680 354V242m40 260v110" fill="none" stroke="#111b27" strokeWidth="20" />
              <path d="M792 393 879 330h53m-100 95h100m-140 32 87 63h53M680 354V242m40 260v110" fill="none" stroke="#89959a" strokeWidth="11" />
              <path d="M795 390 878 327h51m-93 95h93m-132 32 83 62h49M677 345V245m40 270v86" fill="none" stroke="#c0c5ba" strokeWidth="2" />
              <g data-rod-upper><path d="M663 218h34v54h-34Z" fill="#aeb6ad" /><path d="M670 224v37" stroke="#d6d5bd" strokeWidth="3" /></g>
              <g data-rod-lower><path d="M703 592h34v52h-34Z" fill="#8d9b9d" /><path d="M710 598v34" stroke="#c6cebf" strokeWidth="3" /></g>
              {[330, 425, 520].map(y => <g key={y}>
                <rect x="918" y={y - 23} width="56" height="46" rx="4" fill="#46525d" />
                <g data-lock-bolt><path d={`M922 ${y - 13}h71v26h-71Z`} fill="#aeb9b5" /><path d={`M928 ${y - 7}h59`} stroke="#e1dfc6" strokeWidth="3" /></g>
                <path d={`M918 ${y - 23}h12v46h-12Z`} fill="#74828a" />
                <MetalBolt x={924} y={y - 16} radius={3} /><MetalBolt x={924} y={y + 16} radius={3} />
              </g>)}
              <path d="m570 276 13-8m-8 18 13-8m257-17 23 10m-29-2 8 4M580 556l-16 13m28-13-14 14m296-9 11 8M815 590l21 9m-25-1 10 4" fill="none" stroke="#aab6ac" strokeWidth="2" opacity=".65" />
            </g>
            <circle cx="720" cy="425" r="119" fill="#252f3e" />
            <circle cx="720" cy="425" r="108" fill="#7d8b91" strokeWidth="4" />
            <circle cx="720" cy="425" r="97" fill="#aab4ae" strokeWidth="4" />
            <circle cx="720" cy="425" r="79" fill="#384754" strokeWidth="4" />
            {Array.from({ length: 8 }, (_, index) => {
              const angle = (index * 45 - 90) * Math.PI / 180;
              return <MetalBolt key={index} x={720 + Math.cos(angle) * 111} y={425 + Math.sin(angle) * 111} radius={4} />;
            })}
            <g data-wheel>
              {Array.from({ length: 6 }, (_, index) => <g key={index} transform={`rotate(${index * 60} 720 425)`}><path d="M711 346h18l-4 80h-10Z" fill="#a0adb0" strokeWidth="4" /><path d="M716 350v49" fill="none" stroke="#d7d9c5" strokeWidth="2" /></g>)}
              {Array.from({ length: 24 }, (_, index) => <path key={index} transform={`rotate(${index * 15} 720 425)`} d="M720 332v7" fill="none" stroke="#394651" strokeWidth="2" />)}
              <circle cx="720" cy="425" r="30" fill="#a6b3b4" strokeWidth="5" />
              <circle cx="720" cy="425" r="21" fill="#6c7b84" strokeWidth="3" />
              <MetalBolt x={720} y={425} radius={12} />
              <path d="M700 412q9-13 24-10" fill="none" stroke="#e0dfc8" strokeWidth="3" />
            </g>
            {[310, 554].map(y => <g key={y} strokeWidth="4">
              <rect x="428" y={y - 56} width="31" height="112" rx="7" fill="#404e5a" />
              <path d={`M432 ${y - 47}h22m-22 94h22`} fill="none" stroke="#a2afa9" strokeWidth="3" />
              <path d={`M420 ${y - 24}h70v48h-70Z`} fill="#8e9c9c" />
              <path d={`M423 ${y - 18}h59`} stroke="#c7cbb8" strokeWidth="3" />
              <MetalBolt x={475} y={y} radius={6} /><MetalBolt x={440} y={y - 41} radius={4} /><MetalBolt x={440} y={y + 41} radius={4} />
            </g>)}
            <g clipPath={`url(#${id}-door-light)`} pointerEvents="none"><rect data-light-wash x="470" y="145" width="500" height="560" fill={`url(#${id}-surface-light)`} stroke="none" /></g>
          </g>
          <g>{smokeWisps.map((wisp, index) => wisp.depth === 'front' ? <SmokeWisp key={index} index={index} id={id} /> : null)}</g>
        </g>
        </g>
      </svg>

      {!started && <button type="button" className="vault-intro__vault-button" onClick={startIntro} aria-describedby={`${id}-hint`} aria-label="Unlock the vault and enter the portfolio. Plays a 9 second animation with music."><span className="vault-intro__focus-ring" /></button>}
      <div className="vault-intro__hint" id={`${id}-hint`} data-intro-ui>
        {!started && <><span className="vault-intro__hint-line" /><p>Click the vault to enter <span aria-hidden="true">↗</span></p><span className="vault-intro__hint-detail">A little mystery. A lot of possibility.</span></>}
        <button type="button" className="vault-intro__skip" onClick={finish}>Skip intro <span aria-hidden="true">↗</span></button>
      </div>
    </div>
  );
}
