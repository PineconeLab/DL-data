"use client";
import Image from "next/image";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, Music2, Pause } from "lucide-react";
import {
  fair,
  photos,
  meetingPhotos,
  smilePhotos,
  type FairPhoto,
} from "@/lib/heart-fair/content";
import { PhotoViewer } from "./photo";
import { PhotoCarousel } from "./carousel";
const backgrounds = [
  "welcome",
  "beginning",
  "meeting",
  "travel",
  "smile",
  "future",
  "confession",
];
function Box({
  rect,
  className = "",
  children,
}: {
  rect: number[];
  className?: string;
  children: ReactNode;
}) {
  const [x, y, w, h] = rect;
  const style: CSSProperties = {
    left: `${(x / 1024) * 100}%`,
    top: `${(y / 1536) * 100}%`,
    width: `${(w / 1024) * 100}%`,
    height: `${(h / 1536) * 100}%`,
  };
  return (
    <div style={style} className={`prototype-box ${className}`}>
      {children}
    </div>
  );
}
export function HeartFair() {
  const [step, setStep] = useState(0),
    [photo, setPhoto] = useState<FairPhoto | null>(null);
  const [meetingIndex, setMeetingIndex] = useState(0),
    [smileIndex, setSmileIndex] = useState(0);
  const [answer, setAnswer] = useState<"yes" | "later" | null>(null);
  const [playing, setPlaying] = useState(false),
    [audioError, setAudioError] = useState(false);
  const audio = useRef<HTMLAudioElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const stop = fair.stops[step];
  function go(n: number) {
    setStep(n);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() =>
      heading.current?.focus({ preventScroll: true }),
    );
  }
  async function toggleMusic() {
    if (!audio.current) return;
    if (playing) {
      audio.current.pause();
      setPlaying(false);
    } else
      try {
        await audio.current.play();
        setPlaying(true);
      } catch {
        setAudioError(true);
      }
  }
  const nextRects: Record<number, number[]> = {
    0: [176, 1348, 670, 125],
    1: [166, 1317, 691, 133],
    2: [256, 1349, 529, 114],
    3: [194, 1327, 644, 121],
    4: [157, 1346, 707, 108],
    5: [176, 1356, 673, 110],
  };
  return (
    <main className="prototype-fair min-h-screen">
      <div className="prototype-shell mx-auto w-full max-w-[540px]">
        <article
          key={step}
          className={`prototype-sheet generated-sheet generated-step-${step}`}
          style={{ aspectRatio: "2 / 3" }}
        >
          <Image
            className="prototype-background"
            src={`/heart-fair/generated/${backgrounds[step]}.webp`}
            alt=""
            aria-hidden="true"
            width={1024}
            height={1536}
            unoptimized
            loading="eager"
          />
          <div className="sr-only">
            <h1 tabIndex={-1} ref={heading}>
              {stop.label}：{stop.title.replaceAll("\n", "")}
            </h1>
            {stop.date && <p>{stop.date}</p>}
            {stop.paragraphs?.map((p) => (
              <p key={p}>{p}</p>
            ))}
            {stop.note && <p>{stop.note}</p>}
            {step === 0 && (
              <p>
                {fair.people}。{fair.subtitle}上海到南京。目的地：你的身边。
              </p>
            )}
            {step === 3 && (
              <p>
                {fair.places
                  .map((p) => `${p.city}：${p.places.join("、")}`)
                  .join("。")}
              </p>
            )}
          </div>
          {step > 0 && (
            <button
              className="prototype-back"
              onClick={() => go(step - 1)}
              aria-label="返回上一站"
            >
              <ArrowLeft />
            </button>
          )}
          {step === 0 && (
            <Box rect={[114, 1040, 790, 250]}>
              <button
                className="reference-hit"
                onClick={() => setPhoto(photos[0])}
                aria-label="放大查看：放一张我们的合照"
              >
                {photos[0].src && (
                  <Image src={photos[0].src} alt={photos[0].alt} fill sizes="80vw" className="object-contain bg-blue-50" />
                )}
              </button>
            </Box>
          )}
          {step === 2 && (
            <>
              <Box rect={[98, 588, 825, 321]}>
                <PhotoCarousel
                  referencePlaceholder
                  name="第一次见面"
                  photos={meetingPhotos}
                  index={meetingIndex}
                  onChange={setMeetingIndex}
                  onOpen={setPhoto}
                />
              </Box>
              {photos.slice(1, 3).map((p, i) => (
                <Box
                  key={p.id}
                  rect={i === 0 ? [98, 981, 362, 231] : [571, 983, 350, 231]}
                >
                  <button
                    className="reference-hit"
                    aria-label={`放大查看：${p.label}`}
                    onClick={() => setPhoto(p)}
                  >
                    {p.src && (
                      <Image
                        src={p.src}
                        alt={p.alt}
                        fill
                        sizes="40vw"
                        className="object-contain bg-blue-50"
                      />
                    )}
                  </button>
                </Box>
              ))}
            </>
          )}
          {step === 4 && (
            <Box rect={[228, 387, 568, 305]}>
              <PhotoCarousel
                referencePlaceholder
                name="心动的瞬间"
                photos={smilePhotos}
                index={smileIndex}
                onChange={setSmileIndex}
                onOpen={setPhoto}
              />
            </Box>
          )}
          {step === 6 && (
            <>
              <h2 className="sr-only">{fair.question}</h2>
              <Box
                rect={[175, 1176, 675, 212]}
                className="generated-choice-area"
              >
                {!answer ? (
                  <>
                    <button
                      className="reference-hit"
                      onClick={() => setAnswer("yes")}
                      aria-label="我愿意 ♡"
                    />
                    <button
                      className="reference-hit"
                      onClick={() => setAnswer("later")}
                      aria-label="我想再想想"
                    />
                  </>
                ) : (
                  <div className="prototype-answer" role="status">
                    {answer === "yes" ? fair.yes : fair.later}
                    {answer === "yes" && (
                      <div className="prototype-confetti" aria-hidden="true">
                        {Array.from({ length: 12 }, (_, i) => (
                          <i
                            key={i}
                            style={{
                              left: `${i * 8}%`,
                              animationDelay: `${(i % 4) * 0.1}s`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                    <button
                      className="generated-reset"
                      onClick={() => setAnswer(null)}
                    >
                      重新选择
                    </button>
                  </div>
                )}
              </Box>
            </>
          )}
          {step < 6 && (
            <Box rect={nextRects[step]}>
              <button
                className="reference-hit"
                onClick={() => go(step + 1)}
                aria-label={stop.next}
              />
            </Box>
          )}
          <span className="sr-only" aria-live="polite">
            第 {step + 1} 站，共七站
          </span>
          {fair.audio && (
            <button
              className="generated-music"
              onClick={toggleMusic}
              aria-label={playing ? "暂停音乐" : "播放音乐"}
            >
              {playing ? <Pause /> : <Music2 />}
            </button>
          )}
        </article>
        {fair.audio && (
          <audio
            ref={audio}
            src={fair.audio}
            onEnded={() => setPlaying(false)}
            onError={() => setAudioError(true)}
          />
        )}
        {audioError && <p role="status">音乐暂时无法播放。</p>}
      </div>
      {photo && <PhotoViewer photo={photo} onClose={() => setPhoto(null)} />}
    </main>
  );
}
