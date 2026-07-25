import * as React from 'react';
export interface BodyPoint {
  id: string;
  label: string;
  /** Marker position as percentages of the silhouette image box: { x, y } in 0–100. */
  x: number;
  y: number;
  /** action = act now (red, pulsing) · soon = upcoming (amber) · ok = done (green). */
  status: 'action' | 'soon' | 'ok';
  /** Short detail shown when the point is selected. */
  note?: string;
}
export interface BodyMapProps {
  /** Region markers; defaults to a representative Vitalis sample. */
  points?: BodyPoint[];
  /** User sex — selects the silhouette image. 'w' = female, 'm' = male. @default 'w' */
  sex?: 'w' | 'm';
  /** Show the per-region list beside the figure. @default true */
  showList?: boolean;
  /** Show the color legend under the figure. @default true */
  showLegend?: boolean;
  /** Silhouette image width in px (height scales). @default 118 */
  figWidth?: number;
  /** Base path for the silhouette PNGs. @default '../../assets/' */
  imgBase?: string;
  /** Called with the region id when a dot or list row is tapped (opens a drill-down). */
  onOpen?: (regionId: string) => void;
  style?: React.CSSProperties;
}
/**
 * Body overview with tappable status dots overlaid on a real human silhouette
 * (male/female PNG chosen by `sex`). Dots pop in with a staggered spring on mount;
 * "action" dots pulse. Maps where the user needs to act and what is going on, by region.
 * Requires @keyframes v-dot and v-ping on the page.
 * @startingPoint section="Health" subtitle="Body overview with status dots" viewport="360x300"
 */
export declare function BodyMap(props: BodyMapProps): JSX.Element;
