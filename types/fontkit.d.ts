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
    variationAxes?: Record<string, VariationAxis>;
  }

  interface VariationAxis {
    name: string;
    min: number;
    default: number;
    max: number;
  }

  interface FontCollection {
    fonts: Font[];
  }

  export function openSync(
    buffer: Buffer | string,
    postscriptName?: string
  ): Font | FontCollection;

  export function create(buffer: Buffer): Font | FontCollection;
}
