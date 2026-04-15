import { useState, useEffect, useRef, useCallback } from "react";

const TRACKS = [
  "/music/Blind Spots.ogg",
  "/music/Key.ogg",
  "/music/Living Mice.ogg",
  "/music/Oxygene.ogg",
  "/music/Subwoofer Lullaby.ogg",
];

const SPLASHES = [
  "Legacy is back!", "Pixelated goodness!", "Console Edition vibe!", "100% Not Microsoft!",
  "Symmetry is key!", "Does anyone even read these?", "Task failed successfully.",
  "Hardware accelerated!", "It's a feature, not a bug.", "Look behind you.",
  "Works on my machine.", "Now gluten-free!", "Mom, get the camera!", "Batteries not included.",
  "May contain nuts.", "Press Alt+F4 for diamonds!", "Downloading more RAM...",
  "Reinventing the wheel!", "The cake is a lie.", "Powered by copious amounts of coffee.",
  "I'm running out of ideas.", "That's no moon...", "Now with 100% more nostalgia!",
  "Legacy is the new modern.", "No microtransactions!", "As seen on TV!", "Ironic, isn't it?",
  "Creeper? Aww man.", "Technoblade never dies!",
];

interface AudioControllerProps {
  musicVol: number;
  sfxVol: number;
  showIntro: boolean;
  isGameRunning: boolean;
  isWindowVisible: boolean;
}

export function useAudioController({ musicVol, sfxVol, showIntro, isGameRunning, isWindowVisible }: AudioControllerProps) {
  const [currentTrack, setCurrentTrack] = useState(-1); // -1 = randomize mode
  const [playingTrack, setPlayingTrack] = useState(() => Math.floor(Math.random() * TRACKS.length));
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [splashIndex, setSplashIndex] = useState(-1);
  const musicPausedRef = useRef<{ at: number; track: number } | null>(null);
  const fadeIntervalRef = useRef<any>(null);

  const playSfx = useCallback((file: string) => {
    const a = new Audio(`/sounds/${file}`);
    a.volume = sfxVol / 100;
    a.play().catch(() => { });
  }, [sfxVol]);

  const playClickSound = useCallback(() => playSfx("click.wav"), [playSfx]);
  const playBackSound = useCallback(() => playSfx("back.ogg"), [playSfx]);
  const playSplashSound = useCallback(() => playSfx("orb.ogg"), [playSfx]);

  const fadeOut = useCallback((audio: HTMLAudioElement, duration: number = 500) => {
    return new Promise<void>((resolve) => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      const initialVolume = audio.volume;
      const steps = 5;
      const stepDuration = duration / steps;
      let currentStep = 0;
      fadeIntervalRef.current = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        audio.volume = initialVolume * (1 - progress);
        if (currentStep >= steps) {
          if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
          audio.pause();
          audio.volume = initialVolume;
          resolve();
        }
      }, stepDuration);
    });
  }, []);

  const fadeIn = useCallback((audio: HTMLAudioElement, targetVolume: number, duration: number = 500) => {
    return new Promise<void>((resolve) => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      audio.volume = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => { });
      }

      const steps = 5;
      const stepDuration = duration / steps;
      let currentStep = 0;
      fadeIntervalRef.current = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        audio.volume = targetVolume * progress;
        if (currentStep >= steps) {
          if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
          audio.volume = targetVolume;
          resolve();
        }
      }, stepDuration);
    });
  }, []);

  const cycleSplash = useCallback(() => {
    playSplashSound();
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * SPLASHES.length);
    } while (newIndex === splashIndex && SPLASHES.length > 1);
    setSplashIndex(newIndex);
  }, [playSplashSound, splashIndex]);

  useEffect(() => {
    if (showIntro) return;
    if (audioElement) return;

    const audio = new Audio(TRACKS[playingTrack]);
    audio.volume = musicVol / 100;
    const handleEnded = () => {
      if (currentTrack === -1) {
        // Randomize: pick a different track
        setPlayingTrack((prev) => {
          let next;
          do { next = Math.floor(Math.random() * TRACKS.length); } while (next === prev && TRACKS.length > 1);
          return next;
        });
      } else {
        setPlayingTrack((prev) => (prev + 1) % TRACKS.length);
        setCurrentTrack((prev) => (prev + 1) % TRACKS.length);
      }
    };
    audio.addEventListener("ended", handleEnded);

    const tryPlay = () => {
      audio.play().catch((err) => {
        console.warn("Revelations: audio playback failed:", err.message);
        const startMusic = () => {
          audio.play().catch((e) => console.warn("Revelations: audio retry failed:", e.message));
        };
        document.addEventListener("click", startMusic, { once: true });
        document.addEventListener("keydown", startMusic, { once: true });
      });
    };
    tryPlay();

    setAudioElement(audio);
    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
    };
  }, [showIntro, audioElement, playingTrack, musicVol]);

  // When user selects a specific track, sync playingTrack
  useEffect(() => {
    if (currentTrack >= 0) {
      setPlayingTrack(currentTrack);
    } else {
      // Randomize: pick a new random track
      setPlayingTrack(Math.floor(Math.random() * TRACKS.length));
    }
  }, [currentTrack]);

  useEffect(() => {
    if (!audioElement) return;
    audioElement.src = TRACKS[playingTrack];
    audioElement.play().catch((e) => console.warn("Revelations: track change play failed:", e.message));
  }, [playingTrack]);

  useEffect(() => {
    if (!audioElement) return;
    const shouldPause = isGameRunning || !isWindowVisible;

    if (shouldPause) {
      if (!audioElement.paused || fadeIntervalRef.current) {
        if (!musicPausedRef.current) {
          musicPausedRef.current = {
            at: audioElement.currentTime,
            track: playingTrack,
          };
        }
        fadeOut(audioElement, 500);
      }
    } else if (musicPausedRef.current) {
      const { at, track } = musicPausedRef.current;
      musicPausedRef.current = null;
      if (track === playingTrack) {
        audioElement.currentTime = at;
      }
      fadeIn(audioElement, musicVol / 100, 500);
    }
  }, [isGameRunning, isWindowVisible, audioElement, playingTrack, musicVol, fadeOut, fadeIn]);

  useEffect(() => {
    if (audioElement) {
      audioElement.volume = musicVol / 100;
    }
  }, [musicVol, audioElement]);

  return {
    currentTrack,
    setCurrentTrack,
    splashIndex,
    setSplashIndex,
    cycleSplash,
    playClickSound,
    playBackSound,
    playSfx,
    tracks: TRACKS,
    splashes: SPLASHES,
  };
}
