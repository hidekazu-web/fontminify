declare module 'subset-font' {
  function subsetFont(
    fontBuffer: Buffer,
    options: {
      text?: string;
      targetFormat?: 'woff2' | 'woff' | 'ttf' | 'otf';
      hinting?: boolean;
      desubroutinize?: boolean;
      layout?: boolean;
    }
  ): Promise<Buffer>;

  export = subsetFont;
}