// /t page (src/pages/t.astro): copies p and c from this page's address into the perko://t link of the
// "פתחו ב-Perko" button. Nothing else reads them and nothing is sent anywhere. A file, not inline, for the CSP.
(function () {
  var params = new URLSearchParams(window.location.search);
  var p = params.get('p') || '';
  var c = params.get('c') || '';
  var ok = /^[0-9A-Fa-f]{32}$/.test(p) && /^[0-9A-Fa-f]{16}$/.test(c);
  var open = document.getElementById('open');
  if (!open) return;
  if (ok) {
    open.setAttribute('href', 'perko://t?p=' + p + '&c=' + c);
    return;
  }
  open.setAttribute('aria-disabled', 'true');
  open.classList.add('tap-btn-off');
  open.addEventListener('click', function (e) { e.preventDefault(); });
  var bad = document.getElementById('tap-bad');
  var hint = document.getElementById('tap-hint');
  if (bad) bad.removeAttribute('hidden');
  if (hint) hint.setAttribute('hidden', '');
})();
