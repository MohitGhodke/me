/**
 * Chirp's brain: a small LLM that runs entirely in the
 * visitor's browser via WebGPU. Nothing here is fetched until the visitor
 * consents — see `createAssistantSession().load()`.
 *
 * Split in two on purpose:
 *   `buildContext` is pure data-shuffling — testable in Node, no browser.
 *   `createAssistantSession` touches the browser (WebGPU, a CDN import) and
 *   isn't; keeping it thin is what makes that acceptable.
 */
;(function (global) {
  "use strict";

  var isNode = typeof module === "object" && !!module.exports;

  var MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
  var MODEL_SIZE_LABEL = "~600MB";
  var WEBLLM_CDN = "https://esm.run/@mlc-ai/web-llm";

  // The model's context window is 4096 tokens, shared with the running
  // conversation and the reply — so the injected "knowledge base" has to stay
  // short. Facts over prose: long paragraphs are cut to their first sentence.
  var MAX_CONTEXT_CHARS = 6000;

  function firstSentence(text) {
    var m = /^[^.!?]*[.!?]/.exec(text || "");
    return m ? m[0].trim() : text || "";
  }

  /**
   * Flattens the site's own content into one compact plain-text block, used
   * as the model's system prompt — the site's whole "knowledge base." Small
   * enough (~1,200 lines across src/content/) that this beats embeddings/RAG.
   *
   * @param {object} content  the assembled content object (src/content/index.js)
   */
  function buildContext(content) {
    var out = [];

    // A 1B model follows short, numbered, literal rules far more reliably
    // than a paragraph of prose — and needs to be told explicitly not to
    // contradict notes it was just given, or it will confidently invent the
    // opposite of a fact that's sitting right in front of it.
    out.push(
      "You answer questions about " + content.site.name + " for visitors to his portfolio site. Rules:\n" +
        "1. Only use the facts in the notes below — do not add anything they don't say.\n" +
        "2. Read the whole notes section before answering. If a topic is covered below, say what it says — never claim something is missing, unknown, or absent when it is listed below.\n" +
        "3. The question may use different words than the notes (e.g. \"AI\" for \"agent engineering\" or \"fine-tuning\") — match on meaning, not exact spelling.\n" +
        "4. Answer in 2-4 short, plain-text sentences. No markdown.\n" +
        "5. Only say you don't know if the topic truly is not covered anywhere below.\n\n" +
        "Example:\n" +
        "Q: Does he know anything about AI?\n" +
        "A: Yes — his Skills list agent engineering (orchestration agents, MCP servers) and model fine-tuning (LoRA on MLX, RAG, edge inference), on top of 13 years of C#/.NET and Angular."
    );

    out.push("");
    out.push("# " + content.site.name + " — " + content.site.role + " (" + content.site.location + ")");
    out.push(content.resume.summary);

    out.push("");
    out.push("# About");
    (content.about.paragraphs || []).forEach(function (p) {
      out.push(firstSentence(p));
    });

    out.push("");
    out.push("# Skills (includes his AI / machine-learning work)");
    (content.skills.groups || []).forEach(function (g) {
      out.push("- " + g.heading + ": " + (g.items || []).join(", "));
    });

    out.push("");
    out.push("# Experience");
    (content.resume.roles || []).forEach(function (r) {
      out.push("- " + r.title + " at " + r.company + " (" + r.period + "): " + (r.stack || []).join(", "));
    });

    // One named section per collection rather than a merged "shipped work"
    // blob — a weak model matches a question ("his VS Code extensions") to
    // whichever section header echoes its wording, so a vague shared heading
    // reliably loses to a section that happens to mention the same words
    // (the playground's inference-server entry mentions "VS Code" too).
    function listSection(heading, items) {
      if (!items || !items.length) return;
      out.push("");
      out.push("# " + heading);
      items.forEach(function (p) {
        out.push("- " + p.title + " (" + p.meta + "): " + firstSentence(p.summary));
      });
    }

    listSection("VS Code Extensions", content.extensions);
    listSection("iOS Apps", content.apps);
    listSection("Case studies", content.projects);

    if ((content.playground.entries || []).length) {
      out.push("");
      out.push("# Side projects (playground) — unlike the sections above, these are unshipped, experimental, and not VS Code extensions");
      content.playground.entries.forEach(function (e) {
        out.push("- " + e.name + ": " + firstSentence(e.description));
      });
    }

    out.push("");
    out.push("# Contact");
    out.push("Email: " + content.site.email);
    (content.site.links || []).forEach(function (l) {
      out.push(l.label + ": " + l.url);
    });

    var text = out.join("\n");
    return text.length > MAX_CONTEXT_CHARS ? text.slice(0, MAX_CONTEXT_CHARS) : text;
  }

  function isSupported() {
    return typeof navigator !== "undefined" && !!navigator.gpu;
  }

  /**
   * A conversation with the in-browser model. Nothing is downloaded until
   * `load()` is called — that's the visitor's `y`.
   *
   * @param {{onProgress?: (report: {text: string, progress: number}) => void}=} options
   */
  function createAssistantSession(options) {
    var onProgress = (options && options.onProgress) || function () {};
    var engine = null;
    var history = [];

    async function load() {
      if (!isSupported()) throw new Error("webgpu-unsupported");
      var webllm = await import(/* webpackIgnore: true */ WEBLLM_CDN);
      engine = await webllm.CreateMLCEngine(MODEL_ID, {
        initProgressCallback: function (report) {
          onProgress({ text: report.text || "", progress: report.progress || 0 });
        }
      });
    }

    /**
     * @param {string} question
     * @param {string} systemPrompt
     * @param {(delta: string) => void} onToken  called with each streamed chunk
     * @returns {Promise<string>} the full reply
     */
    async function ask(question, systemPrompt, onToken) {
      if (!engine) throw new Error("engine-not-loaded");

      history.push({ role: "user", content: question });
      var messages = [{ role: "system", content: systemPrompt }].concat(history);
      // Low temperature: this is a factual-lookup job, not creative writing —
      // a model this small hallucinates far more at the default temperature.
      var stream = await engine.chat.completions.create({
        messages: messages,
        stream: true,
        temperature: 0.15,
        max_tokens: 300
      });

      var reply = "";
      for await (var chunk of stream) {
        var delta = chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content;
        if (delta) {
          reply += delta;
          onToken(delta);
        }
      }
      history.push({ role: "assistant", content: reply });
      return reply;
    }

    return { load: load, ask: ask };
  }

  var api = {
    MODEL_ID: MODEL_ID,
    MODEL_SIZE_LABEL: MODEL_SIZE_LABEL,
    isSupported: isSupported,
    buildContext: buildContext,
    createAssistantSession: createAssistantSession
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.assistant = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
