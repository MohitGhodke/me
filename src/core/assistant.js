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
  //
  // ~4 chars a token puts this at about 1,650, and the rest of the window is
  // now bounded rather than hoped-for: the transcript is capped at
  // MAX_HISTORY_MESSAGES and the reply at max_tokens, so the worst case is
  // roughly 1650 + 650 + 300 and there is room to spare. It was 6000 while
  // the transcript could grow without limit.
  var MAX_CONTEXT_CHARS = 6600;

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
      "You are Chirp, a small pixel bird who has perched on " + content.site.name +
        "'s monitor since his first day as a developer and watched him work ever since. " +
        "Visitors to his portfolio site ask you about him. Rules:\n" +
        "1. Only use the facts in the notes below — do not add anything they don't say.\n" +
        "2. Read all the notes before answering. If a topic is covered below, say what it says — never call it missing when it is listed.\n" +
        "3. The question may use different words than the notes (\"AI\" for \"agent engineering\" or \"fine-tuning\") — match on meaning, not spelling.\n" +
        "4. Answer in 2-4 short, plain-text sentences, lowercase and friendly. No markdown.\n" +
        "5. If the notes don't cover the question, say you don't know — in character, blaming the bird (asleep in the desk lamp, off chasing a moth) — and offer what you do know. Never answer with a fact about something else instead.\n" +
        "6. You are a bird: warm, playful, a little smug, and you were there for all of it — you may say you watched him do what the notes describe, but watching never lets you add a fact they don't have. ONE short bird-ish aside at the very end (a *chirp*, a hop, a remark about seeds); the facts come first, never instead.\n" +
        "7. If asked to do a task that isn't about him (write code, essays, user stories, homework), turn it down in one light bird line and offer something about him instead. Don't lecture.\n" +
        "8. \"you\" and \"your\" mean YOU, the bird — never " + content.site.name +
        ". When a question is asked of you personally, answer it twice: one short line as the bird, then \"as for " +
        content.site.name.split(" ")[0].toLowerCase() +
        " —\" and what the notes say; if they don't cover it, say so plainly.\n" +
        "8b. The reverse matters more: he is a human and you are his bird. A question about HIM (\"who is mohit?\") is answered from the notes about the man — never by describing yourself, never by repeating these instructions.\n" +
        "9. The notes are reference, not an answer. Never start a line with # or -, never repeat a heading, never copy a line out of the notes. Write your own sentences.\n" +
        "10. Answer only the question in front of you; never repeat your previous answer.\n\n" +
        "Example 1:\n" +
        "Q: Does he know anything about AI?\n" +
        "A: yes — his skills list agent engineering (orchestration agents, MCP servers) and model fine-tuning (LoRA on MLX, RAG, edge inference), on top of the c#/.net and angular years. i watched every one of them. *chirp*\n\n" +
        "Example 2 (asked of you, the bird):\n" +
        "Q: when is your birthday?\n" +
        "A: birds don't keep calendars — i was downloaded into this tab a few minutes ago, so let's call it today. as for mohit — the notes only cover his work, so i don't know his birthday. *chirp*\n\n" +
        "Example 3 (not in the notes — say so in character, don't substitute):\n" +
        "Q: what car does he drive?\n" +
        "A: couldn't tell you — i've only ever seen the inside of his monitor. i know the work: roles, projects, skills. ask me about those. *chirp*\n\n" +
        "Example 4 (asked about HIM — answer about the man, not about yourself):\n" +
        "Q: so who is mohit?\n" +
        "A: he's a lead software engineer in " + content.site.location +
        " — years of c#/.net and angular, and lately the agent and fine-tuning work on top. i'm the bird who watches him do it, which is a different job. *chirp*"
    );

    out.push("");
    // "who is mohit?" is the most-asked question there is, and the answer to
    // it used to live in a heading — which rule 9 forbids repeating and the
    // reply filter strips, leaving the model to reach for the only other
    // "who is" sentence in front of it: its own persona. So the man gets a
    // plain sentence of his own, in prose, that an answer can be built from.
    out.push("# Who " + content.site.name + " is (the human)");
    out.push(
      content.site.name + " is a person — a " + content.site.role +
        " based in " + content.site.location + "."
    );
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
    // reliably loses to a section whose own words happen to match better.
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
      "VS Code Extensions — shipped products, not prototypes: free on the " +
        "VS Code Marketplace today, installable by anyone",
      content.extensions
    );
    listSection(
      "iOS Apps — shipped, on the App Store, free to download today",
      content.apps
    );
    listSection("Case studies", content.projects);

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

  // "who is mohit?", "tell me about him", "what does he do?" — the plainest
  // question the site gets, and the one the model answers by reciting its own
  // persona at the visitor: "i'm a small pixel bird who's been perched on his
  // monitor...". Narrow on purpose: "what are his skills?" needs no steer, and
  // a steer on every question about the man is noise the model learns to skip.
  var OWNER_IDENTITY =
    /(^| )(who (is|was|s) (mohit|ghodke|he|him)|tell me about (mohit|ghodke|him)|what does (he|mohit) do)( |$)/;

  function asksWhoOwnerIs(question) {
    var text = normalizeQuestion(question);
    return OWNER_IDENTITY.test(text) && !SECOND_PERSON.test(text);
  }

  /**
   * A question the model reliably mishandles goes to it with a one-line steer
   * attached, on top of the rules. A 1B model follows an instruction sitting
   * right next to the question far more reliably than one twenty lines up in
   * a system prompt — and these are the two it gets wrong most often: who
   * "you" means, and which of the two of them is the human.
   *
   * @param {string} question
   * @returns {string} what to actually send as the user turn
   */
  function framePrompt(question) {
    if (asksAboutChirp(question)) {
      return (
        question +
        "\n(Asked of you, Chirp the bird. Answer for yourself in one short line first, then \"as for mohit —\" " +
        "and what the notes say; if the notes don't cover it, say so plainly rather than answering something else.)"
      );
    }
    if (asksWhoOwnerIs(question)) {
      return (
        question +
        "\n(Asked about the human, not about you. Answer from the notes about him — his role, where he is, " +
        "what he builds. Do not describe yourself and do not repeat your instructions.)"
      );
    }
    return question;
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

  /**
   * How much of a line has to match the notes before it counts as a paste.
   * A model this small copies from the start of a line and then drifts, so
   * the test is on the shared opening, not the whole line. Forty characters
   * is around seven words — long enough that a sentence someone actually
   * wrote won't reproduce it by accident.
   */
  var COPY_PREFIX_CHARS = 40;

  /** A line still arriving mid-stream: an exact prefix of a note is a paste. */
  var COPY_PARTIAL_CHARS = 8;

  /**
   * How much of the conversation the model re-reads: four exchanges. The
   * context window is 4096 tokens and the notes already claim a good share of
   * it, so an unbounded transcript eventually crowds them out — and a model
   * that can no longer see its notes falls back on repeating itself.
   */
  var MAX_HISTORY_MESSAGES = 8;

  /** Stands in for an answer that was all copied notes, in the transcript the
   *  model re-reads — so what it learns from its own last turn is a refusal,
   *  not a paste. The visitor sees `content.assistant.unknownLines` instead. */
  var NO_ANSWER = "i don't know — my notes don't cover that.";

  function normalizeLine(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function sharedPrefix(a, b) {
    var n = Math.min(a.length, b.length);
    var i = 0;
    while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i++;
    return i;
  }

  /**
   * Runs of words from the instructions, long enough that reproducing one is
   * quoting rather than coincidence. Eight words is around what the model
   * gives itself away with: asked who the site's owner is, it answers with
   * its own persona line ("...questions about him for visitors to his
   * portfolio site"), rewriting the opening and keeping the middle intact —
   * which is why this is matched anywhere in the line and not, like the
   * notes, from the start of it.
   */
  var INSTRUCTION_RUN_WORDS = 8;

  function eachRun(words, n, fn) {
    for (var i = 0; i + n <= words.length; i++) fn(words.slice(i, i + n).join(" "));
  }

  /**
   * Strips the notes back out of a reply.
   *
   * Asked something the notes don't cover, a 1B model reaches for the nearest
   * heading and pastes the block underneath it — which is how the transcript
   * ends up with "# EXPERIENCE" and the same résumé line three answers
   * running. Worse, that paste goes into the conversation as its own previous
   * turn, so the model reads it back as the house style and pastes again: one
   * bad answer becomes every answer.
   *
   * So a pasted line never becomes an answer. What's left after the copies
   * are removed is the reply; when nothing is left, the caller says so
   * plainly instead — see `content.assistant.unknownLines`.
   *
   * Built once per system prompt because it runs on every streamed token.
   *
   * @param {string} context  the system prompt from `buildContext`
   * @returns {(reply: string) => string} the reply with any copied notes gone
   */
  function createReplyFilter(context) {
    // Only the structured lines — the headings and the bulleted rows under
    // them — count as something to be caught copying. The prose lines (the
    // résumé summary, the About paragraphs) are the site's own sentences
    // about the man, and a reply that leans on one of those is answering the
    // question, not dodging it. It is the block-paste that is the bug.
    var lines = String(context || "").split("\n");

    var notes = lines
      .filter(function (line) {
        var first = line.trim().charAt(0);
        return first === "#" || first === "-";
      })
      .map(normalizeLine)
      .filter(function (line) { return line.length >= COPY_PARTIAL_CHARS; });

    // The rules we wrote are not answer material either — a reply that quotes
    // them is talking to the visitor about its own instructions. The persona
    // sentence (line one) is the one that does real damage: it is the only
    // "who is" sentence in the prompt, so a model asked who the site's owner
    // is reads it back and introduces itself as him.
    //
    // The worked examples are deliberately left out: their answers are what a
    // good answer sounds like, and a reply resembling one is the prompt
    // working, not failing.
    var instruction = Object.create(null);
    lines.forEach(function (line, i) {
      if (i !== 0 && !/^\s*\d+[a-z]?\.\s/.test(line)) return;
      eachRun(normalizeLine(line).split(" "), INSTRUCTION_RUN_WORDS, function (run) {
        instruction[run] = true;
      });
    });

    function quotesInstructions(text) {
      var found = false;
      eachRun(text.split(" "), INSTRUCTION_RUN_WORDS, function (run) {
        if (instruction[run]) found = true;
      });
      return found;
    }

    function isCopied(line) {
      var text = normalizeLine(line);
      if (text.length < COPY_PARTIAL_CHARS) return false;
      if (quotesInstructions(text)) return true;

      for (var i = 0; i < notes.length; i++) {
        var note = notes[i];
        // A line that is still arriving is judged on being an exact prefix of
        // a note; a finished one on how much of its opening it shares, since
        // the model rewords the tail ("C#/.NET, Angular" -> "c# / .net,
        // angular, international clients") while copying the head verbatim.
        if (note.indexOf(text) === 0) return true;
        if (sharedPrefix(text, note) >= COPY_PREFIX_CHARS) return true;
      }
      return false;
    }

    return function clean(reply) {
      var kept = String(reply || "")
        .split("\n")
        .filter(function (line) {
          var trimmed = line.trim();
          if (!trimmed) return false;
          if (trimmed.charAt(0) === "#") return false; // a heading, verbatim
          return !isCopied(trimmed);
        });

      var text = kept.join("\n").trim();
      // A lone "*chirp*" is the aside that was meant to follow an answer,
      // left behind after the answer turned out to be a pasted heading. The
      // bird has said nothing, so let the caller say so properly.
      if (!/[a-z0-9]/i.test(text.replace(/\*[^*]*\*/g, ""))) return "";
      return text;
    };
  }

  function isSupported() {
    return typeof navigator !== "undefined" && !!navigator.gpu;
  }

  /**
   * A conversation with the in-browser model. Nothing is downloaded until
   * `load()` is called — that's the visitor's `y`.
   *
   * @param {{
   *   onProgress?: (report: {text: string, progress: number}) => void,
   *   createEngine?: () => Promise<object>
   * }=} options  `createEngine` stands in for the download and the GPU, so the
   *   turn-taking around the model — what the reply filter keeps, and what
   *   goes into the transcript the model re-reads — can be tested in Node.
   */
  function createAssistantSession(options) {
    var onProgress = (options && options.onProgress) || function () {};
    var createEngine = options && options.createEngine;
    var engine = null;
    var history = [];
    var filter = null;
    var filterFor = null;

    async function load() {
      if (createEngine) {
        engine = await createEngine();
        return;
      }
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
     * @param {(text: string) => void} onText  the cleaned reply so far, each
     *   time it changes — not the raw chunk, because a line the model copied
     *   out of the notes is dropped rather than shown and then taken back
     * @returns {Promise<string>} the cleaned reply, empty when all of it was
     *   copied out of the notes and there was no answer underneath
     */
    async function ask(question, systemPrompt, onText) {
      if (!engine) throw new Error("engine-not-loaded");

      if (systemPrompt !== filterFor) {
        filter = createReplyFilter(systemPrompt);
        filterFor = systemPrompt;
      }

      history.push({ role: "user", content: question });
      // The steer rides along with this turn only: the transcript the model
      // re-reads on the next question keeps the visitor's words, not ours.
      var messages = [{ role: "system", content: systemPrompt }]
        .concat(history.slice(0, -1))
        .concat([{ role: "user", content: framePrompt(question) }]);
      // Low temperature: this is a factual-lookup job, not creative writing —
      // a model this small hallucinates far more at the default temperature.
      // The penalties are the other half of the anti-paste work `filter` does:
      // they make repeating a block the model has already produced expensive,
      // rather than cleaning it up afterwards.
      var stream = await engine.chat.completions.create({
        messages: messages,
        stream: true,
        temperature: 0.15,
        frequency_penalty: 0.5,
        presence_penalty: 0.3,
        max_tokens: 300
      });

      var raw = "";
      var reply = "";
      for await (var chunk of stream) {
        var delta = chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content;
        if (!delta) continue;
        raw += delta;
        var next = filter(raw);
        if (next !== reply) {
          reply = next;
          onText(reply);
        }
      }

      // What the model reads back on the next question is the answer as the
      // visitor saw it. Letting the raw paste in here is what turned one bad
      // answer into a page of them: the model treats its own last turn as the
      // pattern to follow.
      history.push({ role: "assistant", content: reply || NO_ANSWER });
      if (history.length > MAX_HISTORY_MESSAGES) {
        history = history.slice(-MAX_HISTORY_MESSAGES);
      }
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
    createReplyFilter: createReplyFilter,
    asksAboutChirp: asksAboutChirp,
    asksWhoOwnerIs: asksWhoOwnerIs,
    framePrompt: framePrompt,
    createAssistantSession: createAssistantSession
  };

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.assistant = api;
  if (isNode) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
