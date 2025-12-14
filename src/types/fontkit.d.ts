declare module 'fontkit' {
  interface Font {
    postscriptName: string;
    fullName: string;
    familyName: string;
    subfamilyName: string;
    copyright: string;
    version: string;
    numGlyphs: number;
    unitsPerEm: number;
    characterSet: Set<number>;
    availableFeatures: string[];
    variationAxes?: VariationAxis[] | Record<string, VariationAxisInfo>;
    namedInstances?: NamedInstance[];
  }

  interface VariationAxis {
    tag: string;
    name: string;
    min: number;
    max: number;
    default: number;
  }

  interface VariationAxisInfo {
    name: string;
    min: number;
    max: number;
    default: number;
  }

  interface NamedInstance {
    name: string;
    coordinates: Record<string, number>;
  }

  interface FontCollection {
    fonts: Font[];
  }

  export function openSync(path: string): Font | FontCollection;
  export function open(path: string): Promise<Font | FontCollection>;
  export function create(buffer: Buffer | Uint8Array): Font | FontCollection;
}
