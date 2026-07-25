Sheet — bottom sheet for quick-add forms and confirmations. Renders over its nearest positioned ancestor (give the phone/app shell `position: relative`).

<Sheet open={open} onClose={close} title="Impfung eintragen">…form…</Sheet>

Requires these keyframes on the page:
@keyframes v-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes v-slide { from { transform: translateY(100%) } to { transform: translateY(0) } }
