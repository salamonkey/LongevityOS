/* Vitalis UI — standalone browser build (no JSX / no Babel; uses React.createElement).
   Sets window.VitalisUI. Load as a plain <script src> AFTER React, ReactDOM and Lucide UMD.
   Mirrors components/*.jsx for standalone previews and the UI kit. */
(function () {
  var React = window.React;
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef;
  function omit(props, keys) { var o = Object.assign({}, props); (keys || []).forEach(function (k) { delete o[k]; }); return o; }

  function Icon(props) {
    var name = props.name, size = props.size == null ? 20 : props.size,
        strokeWidth = props.strokeWidth == null ? 1.75 : props.strokeWidth,
        color = props.color || 'currentColor', style = props.style || {};
    var ref = useRef(null);
    useEffect(function () {
      var tries = 0;
      (function run() {
        if (!(window.lucide && window.lucide.createIcons)) { if (tries++ < 30) setTimeout(run, 80); return; }
        window.lucide.createIcons();
        var svg = ref.current && ref.current.querySelector('svg');
        if (svg) { svg.setAttribute('width', size); svg.setAttribute('height', size); svg.style.strokeWidth = strokeWidth; }
      })();
    }, [name, size, strokeWidth]);
    return h('span', Object.assign({ ref: ref, style: Object.assign({ display: 'inline-flex', width: size, height: size, color: color }, style) }, omit(props, ['name', 'size', 'strokeWidth', 'color', 'style'])),
      h('i', { 'data-lucide': name, style: { width: size, height: size } }));
  }

  var BTN_SIZES = { sm: { h: 36, px: 14, fs: 13, gap: 6, icon: 16 }, md: { h: 48, px: 18, fs: 15, gap: 8, icon: 18 }, lg: { h: 56, px: 22, fs: 16, gap: 8, icon: 20 } };
  var BTN_VARIANTS = {
    primary: { background: 'var(--color-primary)', color: 'var(--text-on-primary)' },
    secondary: { background: 'var(--color-primary-soft)', color: 'var(--color-primary-ink)' },
    ghost: { background: 'transparent', color: 'var(--color-primary-ink)' },
    danger: { background: 'var(--status-overdue)', color: '#fff' }
  };
  function Button(props) {
    var variant = props.variant || 'primary', size = props.size || 'md', fullWidth = !!props.fullWidth,
        disabled = !!props.disabled, s = BTN_SIZES[size] || BTN_SIZES.md;
    var st = Object.assign({
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: s.gap, height: s.h,
      padding: '0 ' + s.px + 'px', fontFamily: 'var(--font-sans)', fontSize: s.fs, fontWeight: 600, lineHeight: 1,
      borderRadius: 'var(--radius-full)', border: '1px solid transparent', cursor: disabled ? 'not-allowed' : 'pointer',
      width: fullWidth ? '100%' : 'auto', transition: 'background .16s ease, opacity .16s ease, transform .08s ease',
      opacity: disabled ? 0.45 : 1, WebkitTapHighlightColor: 'transparent'
    }, BTN_VARIANTS[variant] || BTN_VARIANTS.primary, props.style || {});
    return h('button', Object.assign({
      type: 'button', disabled: disabled, onClick: props.onClick, style: st,
      onMouseDown: function (e) { if (!disabled) e.currentTarget.style.transform = 'scale(.98)'; },
      onMouseUp: function (e) { e.currentTarget.style.transform = 'scale(1)'; },
      onMouseLeave: function (e) { e.currentTarget.style.transform = 'scale(1)'; }
    }, omit(props, ['variant', 'size', 'fullWidth', 'iconLeft', 'iconRight', 'disabled', 'onClick', 'children', 'style'])),
      props.iconLeft ? h(Icon, { name: props.iconLeft, size: s.icon }) : null,
      props.children,
      props.iconRight ? h(Icon, { name: props.iconRight, size: s.icon }) : null);
  }

  var IB_SIZES = { sm: { d: 36, i: 18 }, md: { d: 44, i: 20 }, lg: { d: 52, i: 22 } };
  var IB_VARIANTS = {
    soft: { background: 'var(--color-primary-soft)', color: 'var(--color-primary-ink)' },
    solid: { background: 'var(--color-primary)', color: '#fff' },
    ghost: { background: 'transparent', color: 'var(--slate-500)' },
    surface: { background: 'var(--surface-card)', color: 'var(--color-primary)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)' }
  };
  function IconButton(props) {
    var variant = props.variant || 'soft', size = props.size || 'md', disabled = !!props.disabled, s = IB_SIZES[size] || IB_SIZES.md;
    var st = Object.assign({
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: s.d, height: s.d,
      borderRadius: 'var(--radius-full)', border: '1px solid transparent', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1, transition: 'background .16s, transform .08s'
    }, IB_VARIANTS[variant] || IB_VARIANTS.soft, props.style || {});
    return h('button', Object.assign({ type: 'button', 'aria-label': props.label, disabled: disabled, onClick: props.onClick, style: st },
      omit(props, ['icon', 'variant', 'size', 'label', 'disabled', 'onClick', 'style'])),
      h(Icon, { name: props.icon, size: s.i }));
  }

  function Input(props) {
    var _f = useState(false), focus = _f[0], setFocus = _f[1];
    var hasError = !!props.error;
    var borderColor = hasError ? 'var(--status-overdue)' : focus ? 'var(--color-primary)' : 'var(--border-strong)';
    return h('label', { style: Object.assign({ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-sans)' }, props.style || {}) },
      props.label ? h('span', { style: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' } }, props.label) : null,
      h('span', { style: {
        display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 14px',
        background: props.disabled ? 'var(--surface-sunken)' : 'var(--surface-card)',
        border: '1.5px solid ' + borderColor, borderRadius: 'var(--radius-md)',
        boxShadow: focus && !hasError ? '0 0 0 4px var(--focus-ring)' : 'none', transition: 'border-color .16s, box-shadow .16s'
      } },
        props.icon ? h(Icon, { name: props.icon, size: 18, color: 'var(--text-muted)' }) : null,
        h('input', {
          type: props.type || 'text', value: props.value, onChange: props.onChange, placeholder: props.placeholder, disabled: props.disabled,
          onFocus: function () { setFocus(true); }, onBlur: function () { setFocus(false); },
          style: { flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text-primary)', minWidth: 0 }
        })),
      (props.hint || props.error) ? h('span', { style: { fontSize: 12, color: hasError ? 'var(--status-overdue)' : 'var(--text-secondary)' } }, props.error || props.hint) : null);
  }

  function Card(props) {
    var elevated = props.elevated !== false, clickable = !!props.onClick;
    var st = Object.assign({
      background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)',
      boxShadow: elevated ? 'var(--shadow-sm)' : 'none', padding: props.padding == null ? 16 : props.padding,
      cursor: clickable ? 'pointer' : 'default', transition: 'box-shadow .16s, transform .08s'
    }, props.style || {});
    return h('div', Object.assign({ onClick: props.onClick, role: clickable ? 'button' : undefined, style: st },
      omit(props, ['children', 'padding', 'elevated', 'onClick', 'style'])), props.children);
  }

  var BADGE_MAP = {
    due: { bg: 'var(--status-due-soft)', fg: 'var(--color-primary-ink)' },
    done: { bg: 'var(--status-done-soft)', fg: '#1d6b48' },
    upcoming: { bg: 'var(--status-upcoming-soft)', fg: '#9a6a1c' },
    overdue: { bg: 'var(--status-overdue-soft)', fg: '#b23a2a' },
    neutral: { bg: 'var(--surface-sunken)', fg: 'var(--slate-600)' }
  };
  function Badge(props) {
    var c = BADGE_MAP[props.status || 'neutral'] || BADGE_MAP.neutral;
    return h('span', Object.assign({ style: Object.assign({
      display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
      lineHeight: 1, padding: '5px 10px', borderRadius: 'var(--radius-full)', background: c.bg, color: c.fg
    }, props.style || {}) }, omit(props, ['status', 'children', 'style'])), props.children);
  }

  function Avatar(props) {
    var SZ = { sm: 32, md: 40, lg: 56 }, size = props.size || 'md';
    var d = typeof size === 'number' ? size : (SZ[size] || 40);
    var initials = (props.name || '').split(' ').map(function (w) { return w[0]; }).filter(Boolean).slice(0, 2).join('').toUpperCase();
    return h('span', Object.assign({ style: Object.assign({
      width: d, height: d, borderRadius: 'var(--radius-full)', background: 'var(--color-primary-soft)', color: 'var(--color-primary-ink)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', fontWeight: 700,
      fontSize: d * 0.4, overflow: 'hidden', flex: 'none'
    }, props.style || {}) }, omit(props, ['name', 'src', 'size', 'style'])),
      props.src ? h('img', { src: props.src, alt: props.name, style: { width: '100%', height: '100%', objectFit: 'cover' } }) : initials);
  }

  function ProgressRing(props) {
    var value = props.value || 0, size = props.size || 72, stroke = props.stroke || 8,
        color = props.color || 'var(--color-primary)', track = props.track || 'var(--slate-100)';
    var r = (size - stroke) / 2, c = 2 * Math.PI * r, pct = Math.max(0, Math.min(100, value)), off = c * (1 - pct / 100);
    return h('div', { style: Object.assign({ position: 'relative', width: size, height: size }, props.style || {}) },
      h('svg', { width: size, height: size, style: { transform: 'rotate(-90deg)' } },
        h('circle', { cx: size / 2, cy: size / 2, r: r, fill: 'none', stroke: track, strokeWidth: stroke }),
        h('circle', { cx: size / 2, cy: size / 2, r: r, fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeDasharray: c, strokeDashoffset: off, style: { transition: 'stroke-dashoffset .6s ease' } })),
      h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)' } },
        h('span', { style: { fontSize: size * 0.24, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 } }, props.label !== undefined ? props.label : Math.round(pct) + '%'),
        props.sublabel ? h('span', { style: { fontSize: size * 0.13, color: 'var(--text-secondary)', marginTop: 2 } }, props.sublabel) : null));
  }

  var TONES = {
    primary: { bg: 'var(--color-primary-soft)', fg: 'var(--color-primary)' },
    teal: { bg: 'var(--color-secondary-soft)', fg: 'var(--color-secondary)' },
    green: { bg: 'var(--status-done-soft)', fg: 'var(--status-done)' },
    amber: { bg: 'var(--status-upcoming-soft)', fg: 'var(--status-upcoming)' },
    red: { bg: 'var(--status-overdue-soft)', fg: 'var(--status-overdue)' },
    neutral: { bg: 'var(--surface-sunken)', fg: 'var(--slate-500)' }
  };
  function ListRow(props) {
    var t = TONES[props.tone || 'primary'] || TONES.primary;
    var trailingChevron = props.trailingChevron !== false;
    return h('div', { onClick: props.onClick, style: Object.assign({
      display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', padding: '13px 14px',
      cursor: props.onClick ? 'pointer' : 'default', fontFamily: 'var(--font-sans)'
    }, props.style || {}) },
      props.icon ? h('span', { style: { width: 44, height: 44, borderRadius: 'var(--radius-sm)', background: t.bg, color: t.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' } }, h(Icon, { name: props.icon, size: 20 })) : null,
      h('div', { style: { flex: 1, minWidth: 0 } },
        h('div', { style: { fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, props.title),
        props.subtitle ? h('div', { style: { fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 } }, props.subtitle) : null),
      props.badge ? h(Badge, { status: props.badgeStatus || 'due' }, props.badge) : null,
      (trailingChevron && !props.badge) ? h(Icon, { name: 'chevron-right', size: 18, color: 'var(--text-muted)' }) : null);
  }

  function TabBar(props) {
    var items = props.items || [];
    return h('nav', { style: Object.assign({
      display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: 'var(--tabbar-h)',
      background: 'var(--surface-card)', borderTop: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-nav)', fontFamily: 'var(--font-sans)'
    }, props.style || {}) },
      items.map(function (it) {
        var on = it.key === props.active;
        return h('button', { key: it.key, type: 'button', onClick: function () { props.onChange && props.onChange(it.key); },
          style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, border: 'none', background: 'none', cursor: 'pointer', padding: '6px 10px', color: on ? 'var(--color-primary)' : 'var(--text-muted)', WebkitTapHighlightColor: 'transparent' } },
          h(Icon, { name: it.icon, size: 23, strokeWidth: on ? 2 : 1.75 }),
          h('span', { style: { fontSize: 9, fontWeight: on ? 600 : 500 } }, it.label));
      }));
  }

  function Sheet(props) {
    if (!props.open) return null;
    return h('div', { style: { position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' } },
      h('div', { onClick: props.onClose, style: { position: 'absolute', inset: 0, background: 'rgba(30,42,54,.4)', animation: 'v-fade .2s ease' } }),
      h('div', { style: Object.assign({
        position: 'relative', width: '100%', background: 'var(--surface-card)', borderRadius: 'var(--radius-2xl) var(--radius-2xl) 0 0',
        boxShadow: 'var(--shadow-lg)', padding: '10px 20px 24px', animation: 'v-slide .24s ease'
      }, props.style || {}) },
        h('div', { style: { width: 40, height: 4, borderRadius: 999, background: 'var(--slate-200)', margin: '0 auto 14px' } }),
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 } },
          h('span', { style: { fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' } }, props.title),
          props.onClose ? h(IconButton, { icon: 'x', variant: 'ghost', size: 'sm', label: 'Schließen', onClick: props.onClose }) : null),
        props.children));
  }

  var BM_STATUS = { action: 'var(--status-overdue)', soon: 'var(--status-upcoming)', ok: 'var(--status-done)' };
  var BM_DEFAULT = [
    { id: 'kopf', label: 'Kopf & Sinne', x: 50.6, y: 5.7, status: 'ok', note: 'Augenarzt-Kontrolle erledigt' },
    { id: 'impf', label: 'Impfschutz', x: 11.5, y: 21.8, status: 'action', note: 'Grippeimpfung fällig' },
    { id: 'herz', label: 'Herz & Kreislauf', x: 58.9, y: 23.8, status: 'action', note: 'Blutdruck heute notieren' },
    { id: 'haut', label: 'Haut', x: 71.4, y: 34.8, status: 'soon', note: 'Hautkrebs-Screening in 2 Wochen' },
    { id: 'bauch', label: 'Verdauung', x: 51.1, y: 41.6, status: 'soon', note: 'Darmkrebs-Vorsorge ab 50' },
    { id: 'beine', label: 'Bewegung', x: 38.3, y: 76.7, status: 'ok', note: 'Aktiv – alles gut' }
  ];
  function BodyMap(props) {
    var pts = props.points || BM_DEFAULT;
    var sex = props.sex === 'm' ? 'm' : 'w';
    var base = props.imgBase || '../../assets/';
    var embedded = (typeof window !== 'undefined' && window.VITALIS_BODY) ? (sex === 'm' ? window.VITALIS_BODY.male : window.VITALIS_BODY.female) : null;
    var src = embedded || (base + (sex === 'm' ? 'body-male.png' : 'body-female.png'));
    var first = pts.filter(function (p) { return p.status === 'action'; })[0] || pts[0];
    var _s = useState(first ? first.id : null), sel = _s[0], setSel = _s[1];
    function legItem(c, t) { return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5 } }, h('span', { style: { width: 8, height: 8, borderRadius: 999, background: c } }), t); }
    var legDummy = 0;
    function dot(p, i) {
      var col = BM_STATUS[p.status] || BM_STATUS.ok, on = p.id === sel;
      var anim = { animation: 'v-dot .5s cubic-bezier(.34,1.56,.64,1) both', animationDelay: (120 + i * 80) + 'ms' };
      return h('button', { key: p.id, type: 'button', 'aria-label': p.label, onClick: function () { setSel(p.id); if (props.onOpen) props.onOpen(p.id); },
        style: Object.assign({ position: 'absolute', left: p.x + '%', top: p.y + '%', transform: 'translate(-50%,-50%)', width: 26, height: 26, border: 'none', background: 'none', padding: 0, cursor: 'pointer', display: 'grid', placeItems: 'center' }, anim) },
        p.status === 'action' ? h('span', { style: { gridArea: '1/1', width: 22, height: 22, borderRadius: '50%', border: '2px solid ' + col, opacity: 0.5, animation: 'v-ping 1.9s ease-out infinite' } }) : null,
        h('span', { style: { gridArea: '1/1', width: on ? 20 : 16, height: on ? 20 : 16, borderRadius: '50%', background: col, opacity: 0.22 } }),
        h('span', { style: { gridArea: '1/1', width: on ? 13 : 11, height: on ? 13 : 11, borderRadius: '50%', background: col, border: '2px solid #fff', boxShadow: '0 1px 3px rgba(30,42,54,.35)' } }));
    }
    var figure = h('div', { style: { position: 'relative', width: (props.figWidth || 118), flex: 'none' } },
      h('img', { src: src, alt: sex === 'm' ? 'Männliche Silhouette' : 'Weibliche Silhouette', draggable: false, style: { display: 'block', width: '100%', height: 'auto' } }),
      pts.map(dot));
    return h('div', { style: Object.assign({ display: 'flex', flexDirection: 'column', gap: 12 }, props.style || {}) },
      h('div', { style: { display: 'flex', gap: 14, alignItems: 'center' } },
        figure,
        props.showList === false ? null : h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: 4 } },
          pts.map(function (p) {
            var col = BM_STATUS[p.status] || BM_STATUS.ok, on = p.id === sel;
            return h('button', { key: p.id, type: 'button', onClick: function () { setSel(p.id); if (props.onOpen) props.onOpen(p.id); },
              style: { display: 'flex', alignItems: 'flex-start', gap: 9, width: '100%', textAlign: 'left', border: 'none', background: on ? 'var(--surface-sunken)' : 'transparent', borderRadius: 'var(--radius-sm)', padding: '7px 9px', cursor: 'pointer', fontFamily: 'var(--font-sans)' } },
              h('span', { style: { width: 9, height: 9, borderRadius: 999, background: col, flex: 'none', marginTop: 4 } }),
              h('span', { style: { flex: 1, minWidth: 0 } },
                h('span', { style: { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' } }, p.label),
                on ? h('span', { style: { display: 'block', fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 1, lineHeight: 1.35 } }, p.note) : null));
          }))),
      props.showLegend === false ? null : h('div', { style: { display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-secondary)', paddingTop: 4, borderTop: '1px solid var(--border-subtle)' } },
        legItem(BM_STATUS.action, 'Handeln'), legItem(BM_STATUS.soon, 'Bald dran'), legItem(BM_STATUS.ok, 'Erledigt')));
  }

  function Logo(props) {
    var size = props.size || 34, showWord = props.word !== false, dark = props.reversed;
    var shield = h('svg', { width: size, height: size, viewBox: '0 0 100 100', fill: 'none', style: { flex: 'none' } },
      h('path', { d: 'M50 11 L79 22 Q84 24 84 40 C84 63 70 82 50 90 C30 82 16 63 16 40 Q16 24 21 22 Z', fill: dark ? '#fff' : 'var(--color-primary)' }),
      h('circle', { cx: 50, cy: 48, r: 17, stroke: dark ? 'rgba(43,127,184,.4)' : '#FFFFFF', strokeOpacity: dark ? 1 : 0.34, strokeWidth: 6.5 }),
      h('path', { d: 'M50 31a17 17 0 1 1 -14.2 7.6', stroke: dark ? 'var(--color-primary)' : '#8FCFC9', strokeWidth: 6.5, strokeLinecap: 'round' }));
    if (!showWord) return shield;
    return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: props.gap || 10 } },
      shield,
      h('span', { style: { fontSize: props.wordSize || size * 0.82, fontWeight: 700, letterSpacing: '-.01em', color: dark ? '#fff' : 'var(--slate-900)', fontFamily: 'var(--font-sans)' } }, 'Vitalis'));
  }

  window.VitalisUI = { Icon: Icon, Button: Button, IconButton: IconButton, Input: Input, Card: Card, Badge: Badge, Avatar: Avatar, ProgressRing: ProgressRing, ListRow: ListRow, TabBar: TabBar, Sheet: Sheet, BodyMap: BodyMap, Logo: Logo };
})();
