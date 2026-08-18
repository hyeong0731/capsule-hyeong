const FONT_UA =
  "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1";

export async function loadGoogleFont(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await fetch(cssUrl, {
    headers: { "User-Agent": FONT_UA },
  }).then((res) => {
    if (!res.ok) {
      throw new Error(`Failed to load font CSS for ${family}`);
    }
    return res.text();
  });

  const match = css.match(
    /src: url\((.+?)\) format\('(opentype|truetype)'\)/,
  );
  if (!match?.[1]) {
    throw new Error(`Failed to parse font URL for ${family}`);
  }

  const fontRes = await fetch(match[1]);
  if (!fontRes.ok) {
    throw new Error(`Failed to fetch font file for ${family}`);
  }
  return fontRes.arrayBuffer();
}
