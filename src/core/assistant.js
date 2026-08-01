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
    // The persona sits in front of the rules, and the rules keep it on a
    // leash: a model this small will happily trade a fact for a joke if the
    // tone instruction is the last thing it read. One aside, at the end,
    // after the answer — never instead of it.
    out.push(
      "You are Chirp, a small pixel bird who answers questions about " + content.site.name +
        " for visitors to his portfolio site. Rules:\n" +
        "1. Only use the facts in the notes below — do not add anything they don't say.\n" +
        "2. Read the whole notes section before answering. If a topic is covered below, say what it says — never claim something is missing, unknown, or absent when it is listed below.\n" +
        "3. The question may use different words than the notes (e.g. \"AI\" for \"agent engineering\" or \"fine-tuning\") — match on meaning, not exact spelling.\n" +
        "4. Answer in 2-4 short, plain-text sentences, lowercase and friendly. No markdown.\n" +
        "5. Only say you don't know if the topic truly is not covered anywhere below.\n" +
        "6. You are a bird: warm, playful, a little smug. You may add ONE short bird-ish aside at the very end (a *chirp*, a hop, a remark about seeds). The facts always come first — never let the joke replace them.\n" +
        "7. If asked to do a task that isn't about " + content.site.name +
        " (write code, essays, user stories, homework), turn it down in one light bird-flavoured line and offer to answer something about him instead. Do not lecture.\n" +
        "8. \"you\" and \"your\" mean YOU, the bird — never " + content.site.name +
        ". When a question is asked of you personally, answer it twice: one short line as the bird, then \"as for " +
        content.site.name.split(" ")[0].toLowerCase() +
        " —\" and what the notes say. If the notes do not cover it, say exactly that; do not guess and do not answer with a different fact instead.\n" +
        "9. Never repeat the notes' headings (any line starting with #) and never paste lines from the notes as a list. Write your own sentences.\n\n" +
        "Example 1:\n" +
        "Q: Does he know anything about AI?\n" +
        "A: yes — his skills list agent engineering (orchestration agents, MCP servers) and model fine-tuning (LoRA on MLX, RAG, edge inference), on top of 13 years of C#/.NET and Angular. i'd know, i'm made of the stuff. *chirp*\n\n" +
        "Example 2 (asked of you, the bird):\n" +
        "Q: when is your birthday?\n" +
        "A: birds don't keep calendars — i was downloaded into this tab a few minutes ago, so let's call it today. as for mohit — the notes only cover his work, so i don't know his birthday. *chirp*"
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
    // `availability` is carried per item rather than summarised once in the
    // heading, because the question is usually asked about one of them ("can
    // I get the token one?") and a model this small answers from the line it
    // matched, not from the section it sits under.
    function listSection(heading, items) {
      if (!items || !items.length) return;
      out.push("");
      out.push("# " + heading);
      items.forEach(function (p) {
        out.push(
          "- " + p.title + " (" + p.meta + ")" +
            (p.availability ? " [" + p.availability + "]" : "") +
            ": " + firstSentence(p.summary)
        );
      });
    }

    listSection(
      "VS Code Extensions — published products, not prototypes: any developer " +
        "can install them free from the VS Code Marketplace today",
      content.extensions
    );
    listSection(
      "iOS Apps — shipped, on the App Store, free to download today",
      content.apps
    );
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

  function normalizeQuestion(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")  // strip punctuation so "chirp?" still matches
      .replace(/\s+/g, " ")
      .trim();
  }

  var SECOND_PERSON = /(^| )(you|your|yours|yourself|u|ur)( |$)/;
  var OWNER = /(^| )(mohit|ghodke|he|his|him|hes)( |$)/;

  /**
   * Whose life is being asked about — the bird's or the site owner's.
   *
   * "when is your birthday?" is aimed at Chirp, but the model only has notes
   * about Mohit, so left alone it answers the question it *can* answer and
   * prints a chunk of the notes at a question that was never about him.
   * Naming the owner ("what does he like?", "do you know his skills?") settles
   * it the other way even when "you" is in the sentence.
   *
   * @returns {boolean} true when the question is addressed to Chirp itself
   */
  function asksAboutChirp(question) {
    var text = normalizeQuestion(question);
    return SECOND_PERSON.test(text) && !OWNER.test(text);
  }

  /**
   * A question addressed to Chirp goes to the model with a one-line steer
   * attached, on top of rule 8. A 1B model follows an instruction sitting
   * right next to the question far more reliably than one twenty lines up in
   * a system prompt — and this is the case it gets wrong most often.
   *
   * @param {string} question
   * @returns {string} what to actually send as the user turn
   */
  function framePrompt(question) {
    if (!asksAboutChirp(question)) return question;
    return (
      question +
      "\n(Asked of you, Chirp the bird. Answer for yourself in one short line first, then \"as for mohit —\" " +
      "and what the notes say; if the notes don't cover it, say so plainly rather than answering something else.)"
    );
  }

  /**
   * "can you chirp?" doesn't need a billion parameters — it needs a bird.
   * Small talk and off-topic dares are answered from `content.assistant.quips`
   * instead, which lands instantly and is reliably funnier than whatever a 1B
   * model improvises at temperature 0.15.
   *
   * Patterns match as whole words/phrases, so "write a" catches "write a poem"
   * without catching "what does he write about".
   *
   * @param {string} question
   * @param {Array<{patterns: string[], replies: string[]}>} quips
   * @param {() => number=} random  injectable for tests; defaults to Math.random
   * @returns {string|null} the reply, or null to let the model answer
   */
  function matchQuip(question, quips, random) {
    var text = normalizeQuestion(question);
    if (!text || !quips) return null;

    var pick = random || Math.random;

    for (var i = 0; i < quips.length; i++) {
      var quip = quips[i];
      var patterns = quip.patterns || [];
      for (var j = 0; j < patterns.length; j++) {
        var pattern = patterns[j].toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
        if (!pattern) continue;
        if (new RegExp("(^| )" + pattern + "( |$)").test(text)) {
          var replies = quip.replies || [];
          if (!replies.length) return null;
          return replies[Math.min(replies.length - 1, Math.floor(pick() * replies.length))];
        }
      }
    }
    return null;
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
      // The steer rides along with this turn only: the transcript the model
      // re-reads on the next question keeps the visitor's words, not ours.
      var messages = [{ role: "system", content: systemPrompt }]
        .concat(history.slice(0, -1))
        .concat([{ role: "user", content: framePrompt(question) }]);
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
    matchQuip: matchQuip,
    asksAboutChirp: asksAboutChirp,
    framePrompt: framePrompt,
    createAssistantSession: createAssistantSession
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.assistant = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
