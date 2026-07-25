import * as React from 'react';
export interface ListRowProps {
  /** Leading Lucide icon name. */
  icon?: string;
  /** Icon-chip color tone. @default 'primary' */
  tone?: 'primary' | 'teal' | 'green' | 'amber' | 'red' | 'neutral';
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Trailing badge text; when set, replaces the chevron. */
  badge?: React.ReactNode;
  /** @default 'due' */
  badgeStatus?: 'due' | 'done' | 'upcoming' | 'overdue' | 'neutral';
  /** Show trailing chevron when there is no badge. @default true */
  trailingChevron?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
}
/**
 * The workhorse list item: icon chip + title/subtitle + trailing badge or chevron.
 * @startingPoint section="Data display" subtitle="Task / plan list row" viewport="360x80"
 */
export declare function ListRow(props: ListRowProps): JSX.Element;
