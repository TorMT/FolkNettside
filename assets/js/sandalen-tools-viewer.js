(function (global) {
  'use strict';

  const TOOLS_SRC = '/FolkNettside/diverse/SandalenG%C3%A5rd/filer/SandalenTools%20Inview.html';

  function createModule(config) {
    const slot = config.slot;
    const button = config.button;

    function openInView() {
      slot.innerHTML = ''
        + '<iframe class="tools-frame"'
        + ' src="' + TOOLS_SRC + '"'
        + ' title="SandalenTools inview"'
        + ' loading="eager"></iframe>';
    }

    button.addEventListener('click', openInView);

    return {
      openInView: openInView
    };
  }

  global.SandalenToolsViewer = {
    createModule: createModule
  };
}(window));
