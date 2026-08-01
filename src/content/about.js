/**
 * ▸ EDIT ME — About Me.txt.
 *
 * `paragraphs` renders in order; add as many as you like. `callout` is the
 * boxed "Currently" note at the bottom — set it to `null` to hide the box.
 */
;(function (global) {
  "use strict";

  var about = {
    greeting: "Hello — I'm Mohit.",

    paragraphs: [
      "I'm a lead software engineer. Most days that means C#, .NET and Angular — " +
        "services and front ends that have to keep working while they change. " +
        "The rest of the time I'm building the tooling around them: agents that " +
        "fetch only the context a task actually needs, and small models " +
        "fine-tuned on a private corpus so the answers never have to leave the " +
        "building.",
      // The short first sentence is deliberate: Chirp is handed the first
      // sentence of each paragraph, and this is the fact visitors most often
      // leave without — so it has to survive being cut at the full stop.
      "Everything in the Work folder is shipped and public. Four VS Code " +
        "extensions on the Marketplace and Dinkrum on the App Store, all free " +
        "to install — I build them because I wanted them at work, and they are " +
        "out there because a tool that only helps me isn't finished.",
      "What keeps pulling me back is making an expensive thing cheap. A model " +
        "doesn't need the whole repository to answer one question, and a 3B " +
        "model on a Raspberry Pi can handle plenty of what gets sent to " +
        "something enormous. Most of my side projects are that idea applied " +
        "somewhere new.",
      "Away from a keyboard I photograph birds, which is mostly an exercise in " +
        "sitting still. I design and 3D print things that don't exist yet, and " +
        "build small electronics around an ESP32 — usually to solve a problem I " +
        "could have just bought a solution for."
    ],

    callout: {
      heading: "Currently",
      body:
        "Opening up the source of the four published extensions, and building a " +
        "second iOS app. Both are the same question in different clothes: how " +
        "little does a model actually need to be told?"
    }
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.content = ns.content || {};
  ns.content.about = about;
  if (typeof module === "object" && module.exports) module.exports = about;
})(typeof globalThis !== "undefined" ? globalThis : this);
