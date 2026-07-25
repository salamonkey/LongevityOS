TabBar — the app's fixed bottom navigation (5 tabs for Vitalis: Start, Impfen, Vorsorge, Termine, Safe).

<TabBar active="start" onChange={setTab} items={[
  { key: 'start', label: 'Start', icon: 'layout-grid' },
  { key: 'impfen', label: 'Impfen', icon: 'syringe' },
]} />

Each item: { key, label, icon (Lucide name) }. Active turns primary blue with a heavier stroke.
