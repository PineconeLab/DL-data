import Image from "next/image";
export function Scene({
  kind,
  close = false,
}: {
  kind: "phones" | "travel" | "letter" | "flowers";
  close?: boolean;
}) {
  const dimensions = {
    phones: [1230, 278],
    travel: [1536, 273],
    letter: [800, 235],
    flowers: [670, 235],
  }[kind];
  if (kind === "flowers")
    return (
      <div
        className={`fair-scene fair-pair ${close ? "fair-pair-close" : ""}`}
        role="img"
        aria-label="松树捧着花，站在雪花身边"
      >
        {[0, 1].map((i) => (
          <span key={i}>
            <Image
              src="/heart-fair/flowers.webp"
              width={670}
              height={235}
              alt=""
              sizes="(max-width: 700px) 90vw, 620px"
              loading="eager"
            />
          </span>
        ))}
      </div>
    );
  return (
    <div className={`fair-scene ${close ? "fair-close" : ""}`}>
      <Image
        src={`/heart-fair/${kind}.webp`}
        width={dimensions[0]}
        height={dimensions[1]}
        sizes="(max-width: 700px) 90vw, 620px"
        alt={
          {
            phones: "松松小松树和冰雪小雪花拿着手机，粉色曲线连接着彼此",
            travel: "松树与雪花一起旅行，身旁是高铁、园林和上海建筑",
            letter: "松树认真读信，雪花在花丛中微笑",
            flowers: "松树捧着花，站在雪花身边",
          }[kind]
        }
        loading="eager"
      />
    </div>
  );
}
export function Doodles() {
  return (
    <svg
      aria-hidden="true"
      className="fair-doodles"
      viewBox="0 0 640 180"
      fill="none"
    >
      <path
        d="M-30 98C48 40 72 143 24 123S20 53 77 89M566 68c-40-28-36-56-15-49 13 3 13 22 13 22s18-29 34-13c20 21-17 48-32 56 30-7 63-3 96 32"
        stroke="#ffabae"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="m70 30 5 12 13 3-11 8-1 14-10-10-13 3 6-12-6-11 13 1z"
        stroke="#f4d64d"
        strokeWidth="4"
      />
      <path
        d="m535 121 8 11m-3-31 10 3M99 132l-8 8"
        stroke="#f4d64d"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function PlaceSketch({ index }: { index: number }) {
  return (
    <svg viewBox="0 0 120 66" aria-hidden="true" className="fair-place-sketch">
      <g
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      >
        {index === 3 ? (
          <>
            <path
              d="M23 36q4 28 37 26 33 1 37-26Z"
              fill="#f6c8ac"
              stroke="#a36856"
            />
            <ellipse
              cx="60"
              cy="36"
              rx="37"
              ry="10"
              fill="#f5a878"
              stroke="#a36856"
            />
            <path
              d="M45 25q-8-8 0-17m18 17q-8-8 0-17m16 17q-8-8 0-17"
              stroke="#c5b9a7"
            />
          </>
        ) : index === 2 ? (
          <>
            <path
              d="M10 53q50-67 100 0M10 60q50-67 100 0M15 60h90"
              stroke="#7b9db7"
            />
            <path d="M14 64q9-5 18 0t18 0t18 0t18 0t18 0" stroke="#79c5d2" />
          </>
        ) : index === 6 ? (
          <>
            <path
              d="M30 61V23l12-7 6 45m11 0V10l15-4 5 55M87 61V28l13-7 7 40"
              fill="#c2def3"
              stroke="#4b91c8"
            />
            <path
              d="M68 7V1M35 31l7 0m21-8h8m-8 8h8m-8 8h8m-8 8h8"
              stroke="#4b91c8"
            />
          </>
        ) : (
          <>
            <path
              d="M25 59V31h70v28M20 30q25-4 40-18 15 14 40 18Z"
              fill={index < 4 ? "#fff0c5" : "#f7d0c5"}
              stroke="#6f9599"
            />
            <path
              d="M17 31h86M46 59V40h26v19M32 39v10m55-10v10"
              stroke="#6f9599"
            />
          </>
        )}
        <path
          d="M8 62q-6-22 3-24 10 2 5 24M108 62q-5-25 3-27 11 4 5 27"
          fill="#b9dca6"
          stroke="#9acb97"
        />
      </g>
    </svg>
  );
}
