import { fair } from "@/lib/heart-fair/content";

let audio: HTMLAudioElement | null = null;
let firstPass = true;
let introDone = false;
let armed = false;
let pausedByUser = false;
let unlock: ((event: Event) => void) | null = null;

function disarm() {
  if (!unlock) return;
  window.removeEventListener("click", unlock, true);
  unlock = null;
}

function followIntro() {
  if (!audio || !firstPass || introDone) return;
  if (audio.currentTime < fair.audioIntro) return;
  introDone = true;
  audio.currentTime = fair.audioStart;
}

function replay() {
  if (!audio) return;
  firstPass = false;
  introDone = true;
  audio.currentTime = 0;
  void audio.play();
}

export function ensureFairAudio() {
  if (typeof window === "undefined" || !fair.audio) return null;
  if (audio) return audio;
  audio = document.createElement("audio");
  audio.src = fair.audio;
  audio.preload = "auto";
  audio.autoplay = true;
  audio.setAttribute("playsinline", "");
  audio.hidden = true;
  document.body.appendChild(audio);
  audio.addEventListener("timeupdate", followIntro);
  audio.addEventListener("ended", replay);
  return audio;
}

export function primeFairAudio() {
  const el = ensureFairAudio();
  if (!el || pausedByUser) return Promise.resolve();
  return el.play();
}

export function pauseFairAudio() {
  pausedByUser = true;
  disarm();
  audio?.pause();
}

export function playFairAudio() {
  pausedByUser = false;
  const el = ensureFairAudio();
  if (!el) return Promise.resolve();
  return el.play();
}

export function armFairAudio() {
  const el = ensureFairAudio();
  if (!el || armed) return;
  armed = true;
  unlock = (event: Event) => {
    if (pausedByUser) return;
    const target = event.target;
    if (target instanceof Element && target.closest("[data-music]")) return;
    void el.play().then(() => disarm());
  };
  window.addEventListener("click", unlock, true);
  void el.play().catch(() => {});
}
