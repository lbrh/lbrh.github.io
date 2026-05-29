// Minimal local typings for papaparse so the project builds without @types/papaparse.
// Covers only the surface used in this codebase (Papa.parse with a File input).
declare module "papaparse" {
  export interface ParseError {
    type: string;
    code: string;
    message: string;
    row?: number;
  }

  export interface ParseResult<T> {
    data: T[];
    errors: ParseError[];
    meta: {
      delimiter: string;
      linebreak: string;
      aborted: boolean;
      truncated: boolean;
      fields?: string[];
    };
  }

  export interface ParseConfig<T = unknown> {
    header?: boolean;
    skipEmptyLines?: boolean | "greedy";
    transformHeader?: (header: string, index: number) => string;
    complete?: (results: ParseResult<T>) => void;
    error?: (error: ParseError) => void;
    dynamicTyping?: boolean;
  }

  export function parse<T = unknown>(
    input: File | string,
    config?: ParseConfig<T>,
  ): void;

  const Papa: {
    parse: typeof parse;
  };

  export default Papa;
}
