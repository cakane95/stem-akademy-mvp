// <!-- assets/js/terminal.js (script classique, pas de export/import) -->

(function () {
  // Petit garde‑fou : vérifie que xterm est bien chargé
  if (!window.Terminal || !window.FitAddon) {
    console.error('[terminal.js] xterm ou FitAddon introuvable. Vérifie l’ordre des <script>.');
    return;
  }

  // Thème (aligné à ta charte)
  const brandTheme = {
    background: '#001F3D',
    foreground: '#DBF0FF',
    cursor:     '#E87A00',
    selection:  '#DBF0FF33',

    black:        '#001F3D',
    red:          '#E87A00',
    green:        '#7AD9C2',
    yellow:       '#F8DCBF',
    blue:         '#005EA0',
    magenta:      '#8F6AD9',
    cyan:         '#A6E4FF',
    white:        '#EAF6FF',

    brightBlack:  '#073464',
    brightRed:    '#FF8F26',
    brightGreen:  '#98E6D3',
    brightYellow: '#FFE9CF',
    brightBlue:   '#2C7FBF',
    brightMagenta:'#A98BEB',
    brightCyan:   '#CBEFFF',
    brightWhite:  '#FFFFFF'
  };

  // Expose une fonction globale utilisable par quest-player.js
  window.createTerminalIn = function createTerminalIn(container) {
    const term = new window.Terminal({
      cursorBlink: true,
      convertEol:  true,
      allowTransparency: true,
      fontSize: 13,
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      theme: brandTheme
    });

    const fitAddon = new window.FitAddon.FitAddon();
    term.loadAddon(fitAddon);

    term.open(container);
    try { fitAddon.fit(); } catch {}

    // Resize
    window.addEventListener('resize', () => {
      try { fitAddon.fit(); } catch {}
    });

    return { term, fitAddon };
  };

  console.log('[terminal.js] OK — Terminal prêt (global).');
})();

