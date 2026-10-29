"use client";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Music2,
  Pause,
  Ticket,
} from "lucide-react";
import { fair, photos, type FairPhoto } from "@/lib/heart-fair/content";
import { Doodles, PlaceSketch, Scene } from "./art";
import { PhotoCard, PhotoViewer } from "./photo";
import { Confession } from "./response";
export function HeartFair() {
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState<FairPhoto | null>(null);
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const stop = fair.stops[step];
  function go(next: number) {
    setStep(next);
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
    } else {
      try {
        await audio.current.play();
        setPlaying(true);
      } catch {
        setAudioError(true);
      }
    }
  }
  return (
    <main className="heart-fair min-h-screen px-3 py-5 sm:px-6 sm:py-10">
      <div className="fair-shell mx-auto max-w-[720px]">
        <div className="fair-outside flex items-center justify-between px-3 pb-4">
          <span>一份只为你准备的心意</span>
          <span>SONGSONG & BINGXUE</span>
        </div>
        <article className="fair-paper relative isolate px-5 py-6 sm:px-14 sm:py-9">
          <header className="relative z-10 flex items-center justify-between gap-3">
            <button
              className="fair-back inline-flex items-center gap-1"
              disabled={step === 0}
              onClick={() => go(step - 1)}
              aria-label="返回上一站"
            >
              <ArrowLeft size={17} />
              上一站
            </button>
            <span className="fair-small tabular-nums">
              {String(step + 1).padStart(2, "0")} / 07
            </span>
            {fair.audio ? (
              <button
                className="fair-icon"
                onClick={toggleMusic}
                aria-label={playing ? "暂停音乐" : "播放音乐"}
              >
                {playing ? <Pause size={18} /> : <Music2 size={18} />}
              </button>
            ) : (
              <span className="fair-small">松松 × 冰雪</span>
            )}
          </header>
          {fair.audio && (
            <audio
              ref={audio}
              src={fair.audio}
              onEnded={() => setPlaying(false)}
              onError={() => setAudioError(true)}
            />
          )}
          {audioError && <p role="status">音乐暂时无法播放。</p>}
          <div className="fair-page relative" key={step}>
            <Doodles />
            <div className="relative z-10 pt-7 text-center">
              <p className="fair-station">
                {step === 0 ? fair.people : stop.label}
              </p>
              <div
                className={`fair-title-wrap ${[0, 1, 3, 6].includes(step) ? "fair-cloud" : ""}`}
              >
                <h1
                  ref={heading}
                  tabIndex={-1}
                  className="fair-title whitespace-pre-line"
                >
                  {stop.title}
                </h1>
              </div>
              {stop.date && (
                <p className="fair-date">
                  <MapPin size={17} />
                  {stop.date}
                </p>
              )}
            </div>
            {step === 0 && (
              <>
                <p className="fair-subtitle text-center">
                  <span className="fair-pink">{fair.subtitle}</span>
                </p>
                <Scene kind="travel" />
                <div className="fair-ticket">
                  <span className="fair-ticket-label">
                    <Ticket size={17} /> 心动列车 · 单程票
                  </span>
                  <p>
                    {fair.cities[0]} <ArrowRight aria-hidden="true" />{" "}
                    {fair.cities[1]}
                  </p>
                  <span>目的地：你的身边</span>
                  <div className="fair-ticket-bottom">
                    <span>乘客 / 松松 & 冰雪</span>
                    <span>专属席位 ♡</span>
                  </div>
                </div>
                <p className="fair-intro text-center">
                  把相遇、想念和喜欢，
                  <br />
                  装进这一本小小的旅行纪念册。
                </p>
              </>
            )}
            {step === 1 && (
              <>
                <Scene kind="phones" />
                <div className="fair-prose">
                  {stop.paragraphs?.map((p, i) => (
                    <p key={p} className={i ? "fair-pink" : ""}>
                      {p}
                    </p>
                  ))}
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <div className="fair-prose mt-6">
                  <p>{stop.paragraphs?.[0]}</p>
                </div>
                <Scene kind="travel" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <PhotoCard photo={photos[0]} large onOpen={setPhoto} />
                  </div>
                  {photos.slice(1, 3).map((p) => (
                    <PhotoCard key={p.id} photo={p} onOpen={setPhoto} />
                  ))}
                </div>
                <p className="fair-note fair-highlight">{stop.note}</p>
              </>
            )}
            {step === 3 && (
              <>
                <div className="fair-route">
                  {fair.places.map((city, group) => (
                    <section key={city.city} className="fair-city">
                      <h2>
                        {city.city}
                        <span>
                          {" "}
                          / {group ? "下一程，依然是你" : "故事开始的地方"}
                        </span>
                      </h2>
                      <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                        {city.places.map((place, i) => (
                          <div key={place} className="fair-place">
                            <PlaceSketch index={group * 4 + i} />
                            <span className="fair-pink">{place}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
                <Scene kind="travel" />
                <div className="fair-prose fair-highlight">
                  {stop.paragraphs?.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              </>
            )}
            {step === 4 && (
              <>
                <div className="mt-7">
                  <PhotoCard photo={photos[3]} large onOpen={setPhoto} />
                </div>
                <div className="fair-prose mt-8">
                  {stop.paragraphs?.map((p, i) => (
                    <p key={p} className={i === 0 ? "fair-highlight" : ""}>
                      {p}
                    </p>
                  ))}
                </div>
                <Scene kind="letter" />
              </>
            )}
            {step === 5 && (
              <>
                <Scene kind="travel" />
                <div className="fair-prose fair-letter">
                  {stop.paragraphs?.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                  <p className="fair-highlight font-semibold">{stop.note}</p>
                  <span className="fair-signature">—— 松松</span>
                </div>
              </>
            )}
            {step === 6 && <Confession />}
            {step < 6 && (
              <button
                className="fair-primary mt-8 inline-flex w-full items-center justify-center gap-2"
                onClick={() => go(step + 1)}
              >
                {stop.next}
                <ArrowRight size={23} />
              </button>
            )}
          </div>
          <nav
            aria-label="游园站点"
            className="fair-progress mt-7 flex items-center justify-center gap-3"
          >
            {fair.stops.map((s, i) => (
              <button
                key={s.label}
                onClick={() => go(i)}
                aria-label={`前往${s.label}`}
                aria-current={step === i ? "step" : undefined}
                className={step === i ? "active" : ""}
              />
            ))}
          </nav>
          <p className="fair-small mt-4 text-center">
            {step === 6 ? "谢谢你，走到这一站。" : "不赶时间，我们慢慢走。"}
          </p>
        </article>
        <footer className="fair-outside py-5 text-center">
          FOR BINGXUE · 用心收藏的七站旅程
        </footer>
      </div>
      {photo && <PhotoViewer photo={photo} onClose={() => setPhoto(null)} />}
    </main>
  );
}
