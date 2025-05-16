import 'chart.js';

declare module 'chartjs-plugin-zoom' {
  const plugin: any;
  export default plugin;
}

declare module 'chartjs-plugin-annotation' {
  const plugin: any;
  export default plugin;
}

declare module 'chart.js' {
  interface ChartOptions {
    plugins?: {
      zoom?: {
        pan?: {
          enabled?: boolean;
          mode?: 'x' | 'y' | 'xy';
          modifierKey?: 'ctrl' | 'alt' | 'shift' | 'meta';
        };
        zoom?: {
          wheel?: {
            enabled?: boolean;
            modifierKey?: 'ctrl' | 'alt' | 'shift' | 'meta';
          };
          pinch?: {
            enabled?: boolean;
          };
          mode?: 'x' | 'y' | 'xy';
        };
      };
      annotation?: {
        annotations?: {
          [key: string]: {
            type: string;
            yMin: number;
            yMax: number;
            borderColor: string;
            borderWidth: number;
            borderDash?: number[];
          };
        };
      };
    };
  }
} 