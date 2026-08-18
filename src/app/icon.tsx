import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f6efe4",
        }}
      >
        <div
          style={{
            width: 16,
            height: 24,
            borderRadius: 999,
            backgroundImage: "linear-gradient(180deg, #e4d2ae, #c9a36a 55%, #5c402a)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
