/**
 * The signature layer (D-THEME-2): near-black base with a faint vertical
 * gradient, one soft glow tinted by the active move hue (crossfades, drifts
 * on a ~56 s cycle, still under reduced motion), a static grain and a
 * vignette. Pure CSS (globals.css, `.ambient*`), fixed behind everything,
 * hidden from assistive tech, never hit-tested. Mounted once in the root
 * layout as a sibling before the page, never as a wrapper.
 */
export function AmbientLayer() {
  return (
    <div aria-hidden="true" data-slot="ambient" className="ambient">
      <div className="ambient-glow" />
      <div className="ambient-vignette" />
      <div className="ambient-grain" />
    </div>
  );
}
