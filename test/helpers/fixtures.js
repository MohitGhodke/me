/** Shared fixtures: a fixed viewport and a fully built view model. */
"use strict";

const { content } = require("../../src/content/index.js");
const { createWindowManager } = require("../../src/core/window-manager.js");
const { createViewModel } = require("../../src/app/view-model.js");

/** A deterministic 1440×900 viewport, so geometry assertions don't drift. */
function viewport(width = 1440, height = 900) {
  return { width: () => width, height: () => height };
}

function windowManager(size) {
  return createWindowManager({ geometry: content.geometry, viewport: viewport(...(size || [])) });
}

/**
 * Build the render values the template sees.
 * @param {object=} overrides  any field of the view-model context
 */
function buildVals(overrides) {
  const wm = windowManager();
  const vm = createViewModel(content);
  return vm.build(
    Object.assign(
      {
        state: wm.empty(),
        wm,
        view: "icons",
        openMenu: null,
        isMobile: false,
        isApplePlatform: true,
        item: { list: "projects", index: 0 },
        clock: "9:41",
        toast: "",
        showBoot: false,
        isOff: false
      },
      overrides
    )
  );
}

module.exports = { content, viewport, windowManager, buildVals };
