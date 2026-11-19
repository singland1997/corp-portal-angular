/** Public build-time settings. These values are visible in the browser bundle. */
export interface AppEnvironment {
  readonly name: 'local' | 'dev' | 'prod';
  readonly apiBaseUrl: string;
}
