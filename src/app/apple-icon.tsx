import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f6efe4",
          backgroundImage:
            "radial-gradient(circle at 50% 18%, rgba(244,196,92,0.45), transparent 58%)",
        }}
      >
        <div
          style={{
            width: 72,
            height: 112,
            borderRadius: 999,
            backgroundImage: "linear-gradient(180deg, #e4d2ae, #c9a36a 55%, #5c402a)",
            boxShadow: "0 18px 36px rgba(201,163,106,0.35)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
