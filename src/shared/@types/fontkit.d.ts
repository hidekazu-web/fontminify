declare module 'fontkit' {
  interface Font {
    numGlyphs: number;
    familyName: string;
    subfamilyName: string;
    fullName: string;
    postscriptName: string;
    copyright: string;
    version: string;
    unitsPerEm: number;
    ascent: number;
    descent: number;
    lineGap: number;
    underlinePosition: number;
    underlineThickness: number;
    italicAngle: number;
    capHeight: number;
    xHeight: number;
    bbox: { minX: number; minY: number; maxX: number; maxY: number };
    characterSet: number[];
    availableFeatures: string[];
    hasGlyphForCodePoint(codePoint: number): boolean;
    glyphForCodePoint(codePoint: number): Glyph;
    glyphsForString(str: string): Glyph[];
    layout(str: string, features?: Record<string, boolean>): GlyphRun;
  }

  interface FontCollection {
    fonts: Font[];
  }

  interface Glyph {
    id: number;
    name: string;
    codePoints: number[];
    path: Path;
    bbox: { minX: number; minY: number; maxX: number; maxY: number };
    advanceWidth: number;
    render(ctx: CanvasRenderingContext2D, size: number): void;
  }

  interface GlyphRun {
    glyphs: Glyph[];
    positions: Array<{ xAdvance: number; yAdvance: number; xOffset: number; yOffset: number }>;
    advanceWidth: number;
    advanceHeight: number;
  }

  interface Path {
    commands: Array<{ type: string; args: number[] }>;
    toSVG(): string;
  }

  function openSync(buffer: Buffer | ArrayBuffer): Font | FontCollection;
  function open(buffer: Buffer | ArrayBuffer): Promise<Font | FontCollection>;

  export { Font, FontCollection, Glyph, GlyphRun, Path };
  export { openSync, open };
}
