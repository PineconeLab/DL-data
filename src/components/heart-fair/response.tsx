"use client";
import { useState } from "react";
import { fair } from "@/lib/heart-fair/content";
import { Scene } from "./art";
export function Confession() {
  const [answer, setAnswer] = useState<"yes" | "later" | null>(null);
  return (
    <>
      <Scene kind="flowers" close={answer === "yes"} />
      <p className="fair-prose text-center whitespace-pre-line">
        {fair.stops[6].paragraphs?.[0]}
      </p>
      <h2 className="fair-question fair-highlight">{fair.question}</h2>
      {!answer ? (
        <div className="flex flex-col gap-3">
          <button className="fair-primary" onClick={() => setAnswer("yes")}>
            我愿意 ♡
          </button>
          <button className="fair-secondary" onClick={() => setAnswer("later")}>
            我想再想想
          </button>
          <p className="fair-small text-center">按你的节奏回答就好。</p>
        </div>
      ) : (
        <div className="fair-response" role="status">
          {answer === "yes" && (
            <div className="fair-confetti" aria-hidden="true">
              {Array.from({ length: 16 }, (_, i) => (
                <i
                  key={i}
                  style={{
                    left: `${i * 6}%`,
                    animationDelay: `${(i % 5) * 0.1}s`,
                    background: ["#ffd1df", "#f4db53", "#a7d8f7", "#b1d6b3"][
                      i % 4
                    ],
                    rotate: `${i * 31}deg`,
                  }}
                />
              ))}
            </div>
          )}
          <p>{answer === "yes" ? fair.yes : fair.later}</p>
          <button
            className="fair-small mt-5 underline underline-offset-4"
            onClick={() => setAnswer(null)}
          >
            重新选择
          </button>
        </div>
      )}
    </>
  );
}
