export interface LoaderContext {
  resourcePath: string;
  sourceMap?: boolean;
  getOptions(): Record<string, unknown>;
  async(): (error: Error | null, code?: string, map?: unknown) => void;
  addDependency(file: string): void;
  addContextDependency?(dir: string): void;
}

export const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));
