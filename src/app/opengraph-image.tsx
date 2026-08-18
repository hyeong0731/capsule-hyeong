import { ImageResponse } from "next/og";
import { loadGoogleFont } from "@/lib/og-font";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const OG_TEXT = `${SITE.nameEn} ${SITE.name} ${SITE.tagline} ${SITE.shortDescription}`;

export default async function Image() {
  const [sans, serif] = await Promise.all([
    loadGoogleFont("Noto Sans KR", 500, OG_TEXT),
    loadGoogleFont("Noto Serif KR", 700, OG_TEXT),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: "#100e0c",
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(201,163,106,0.28), transparent 58%), radial-gradient(ellipse 45% 40% at 100% 110%, rgba(92,64,42,0.4), transparent 55%)",
          color: "#f3eadc",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            letterSpacing: "0.28em",
            fontSize: 22,
            color: "#9d9183",
            fontFamily: "Noto Sans KR",
          }}
        >
          {SITE.nameEn.toUpperCase()}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              marginBottom: 36,
            }}
          >
            <CapsuleShape color="#6A8AAA" scale={0.82} offset={16} />
            <CapsuleShape color="#C9A36A" scale={1} offset={0} />
            <CapsuleShape color="#7A9A86" scale={0.82} offset={16} />
          </div>
          <div
            style={{
              fontSize: 72,
              fontFamily: "Noto Serif KR",
              lineHeight: 1.1,
            }}
          >
            {SITE.tagline}
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 28,
              color: "#d8ccba",
              fontFamily: "Noto Sans KR",
              lineHeight: 1.5,
            }}
          >
            {SITE.shortDescription}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#c9a36a",
            fontSize: 24,
            fontFamily: "Noto Sans KR",
          }}
        >
          <span>{SITE.name}</span>
          <span>capsule-hyeong.vercel.app</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Noto Sans KR", data: sans, weight: 500, style: "normal" },
        { name: "Noto Serif KR", data: serif, weight: 700, style: "normal" },
      ],
    },
  );
}

function CapsuleShape({
  color,
  scale,
  offset,
}: {
  color: string;
  scale: number;
  offset: number;
}) {
  const width = 86 * scale;
  const height = 128 * scale;

  return (
    <div
      style={{
        display: "flex",
        width,
        height,
        marginRight: 18,
        marginTop: offset,
        borderRadius: 999,
        backgroundImage: `linear-gradient(180deg, ${color}, #241f19)`,
        boxShadow: `0 18px 40px ${color}55`,
      }}
    />
  );
}
