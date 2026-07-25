import * as React from 'react';
export interface TabItem { key: string; label: string; icon: string; }
export interface TabBarProps {
  items: TabItem[];
  /** key of the active tab. */
  active?: string;
  onChange?: (key: string) => void;
  style?: React.CSSProperties;
}
/** Fixed bottom navigation, 3–5 items. Active item turns primary blue. */
export declare function TabBar(props: TabBarProps): JSX.Element;
