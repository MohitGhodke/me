/**
 * ▸ EDIT ME — the case studies inside the Work folder.
 *
 * Each entry becomes one file icon and one window. Add a fifth and it appears
 * on its own; no layout change needed.
 *
 *   file     the filename shown under the icon — keep the ".case" suffix
 *   title    the headline inside the window
 *   meta     "Company · Year · Role"
 *   image    caption for the hero well (swap for a real <img> when you have one)
 *   summary  one paragraph of context: the problem, and what you did
 *   outcomes the numbers — three is the sweet spot
 *   tags     the stack
 *
 * ⚠︎ PLACEHOLDER: all four case studies below are sample copy.
 */
;(function (global) {
  "use strict";

  var projects = [
    {
      file: "payments.case",
      title: "Re-platforming payments without downtime",
      meta: "Acme Systems · 2023 · Lead",                                  // PLACEHOLDER
      image: "architecture diagram",
      summary:
        "The payment service was a single Rails monolith taking 2M requests a day " +
        "and failing loudly every Friday. I led a four-person team through an " +
        "incremental move to Go services behind a routing shim, with no " +
        "maintenance window and no customer-visible change.",
      outcomes: [
        "p99 latency 340ms → 90ms",
        "Zero downtime across a 7-month migration",
        "Failure rate down 4.1% → 0.3%"
      ],
      tags: ["Go", "Kafka", "Postgres", "Kubernetes"]
    },
    {
      file: "ingest.case",
      title: "Event pipeline at 40k events/sec",
      meta: "Northwind Labs · 2021 · Senior",                              // PLACEHOLDER
      image: "pipeline throughput chart",
      summary:
        "Customer analytics needed exactly-once ingestion with sane replay. I " +
        "designed and built the pipeline end to end — schema registry, dedup " +
        "layer, and a replay tool that lets support fix a bad day of data in " +
        "minutes instead of a week.",
      outcomes: [
        "40k events/sec sustained, 120k peak",
        "Replay time for a full day: 6 min",
        "Adopted by 3 other product teams"
      ],
      tags: ["Kafka", "Python", "Avro", "Terraform"]
    },
    {
      file: "deploys.case",
      title: "One deploy pipeline for twelve services",
      meta: "Acme Systems · 2024 · Lead",                                  // PLACEHOLDER
      image: "pipeline UI screenshot",
      summary:
        "Every team had its own deploy script and its own outages. I built a " +
        "shared pipeline with progressive rollout and automatic rollback, then " +
        "spent as much time on migration docs and pairing as on the code itself.",
      outcomes: [
        "Deploy frequency 2/week → 14/day",
        "Rollbacks automated, MTTR down 71%",
        "12 of 12 services migrated in a quarter"
      ],
      tags: ["Terraform", "ArgoCD", "Go", "Grafana"]
    },
    {
      file: "oncall.case",
      title: "Making on-call something people accept",
      meta: "Acme Systems · 2025 · Lead",                                  // PLACEHOLDER
      image: "before/after alert volume",
      summary:
        "Not a system, a culture problem. I audited every alert, deleted the ones " +
        "nobody acted on, rewrote the runbooks as decision trees, and made " +
        "blameless review a real meeting rather than a doc nobody read.",
      outcomes: [
        "Pages per week 47 → 9",
        "Every remaining alert has a runbook",
        "On-call satisfaction 2.1 → 4.3 / 5"
      ],
      tags: ["SRE", "Grafana", "Process", "Leadership"]
    }
  ];

  var ns = (global.MohitOS = global.MohitOS || {});
  ns.content = ns.content || {};
  ns.content.projects = projects;
  if (typeof module === "object" && module.exports) module.exports = projects;
})(typeof globalThis !== "undefined" ? globalThis : this);
