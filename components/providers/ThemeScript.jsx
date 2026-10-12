/**
 * Runs before first paint, so the theme and the boot state are correct on the
 * very first frame: no flash of the wrong theme, and no second showing of the
 * loader when you navigate back into the app in the same tab.
 */
const SCRIPT = `
(function () {
  try {
    var root = document.documentElement;
    var stored = localStorage.getItem('jobai.theme');
    var dark = stored ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'dark' : 'light';
    if (sessionStorage.getItem('jobai.booted')) root.dataset.boot = 'skip';
  } catch (error) {
    document.documentElement.dataset.theme = 'light';
  }
})();
`;

export function ThemeScript() {
  return (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: SCRIPT }}
    />
  );
}
