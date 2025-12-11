declare module 'subset-font' {
  interface SubsetOptions {
    targetFormat?: 'woff2' | 'woff' | 'ttf' | 'otf' | 'sfnt';
    preserveHinting?: boolean;
    desubroutinize?: boolean;
    text?: string;
  }

  function subsetFont(
    fontBuffer: Buffer,
    text: string | SubsetOptions,
    options?: SubsetOptions
  ): Promise<Buffer>;

  export = subsetFont;
}
