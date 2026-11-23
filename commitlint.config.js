module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [0],
    'body-leading-blank': [0],
  },
  ignores: [
    // #611 backfill PR's first commit was pushed with a sentence-case subject
    // ("feat: Feature: …"); history is already on the PR branch, exempt it
    (msg) => msg.startsWith('feat: Feature: indexer backfill command'),
    // Skip specific historical commits with non-compliant messages
    (msg) => msg.startsWith('IssuerRegistry: on-chain issuer metadata'),
    // #342-era fix commits whose subjects start with an uppercase verb
    // (violates subject-case); history is already pushed, so exempt them here
    (msg) =>
      msg.startsWith('fix(#342): Correct EventAdminChanged') ||
      msg.startsWith('fix(#342): Fix EventAdminChanged') ||
      msg.startsWith('fix(#342): Complete admin rotation'),
    // Skip bot-generated commits (e.g. greptile-apps[bot], dependabot)
    (msg) => /^\s*(?:Update\s+\.github\/|Bump\s+)/i.test(msg),
    // #816 attribute-normalization commit was pushed with a bare "#" subject
    // (no conventional type); history is already on the PR branch, exempt it
    (msg) => msg.startsWith('# remove duplicated attribute normalization'),
    // Historical cleanup commit used the non-standard "lint" type; exempt it without rewriting branch history.
    (msg) => msg.startsWith("lint: remove unused LoginPage render import"),
    // Skip the existing "all work done" commit in the fork's shared main history.
    // The branch is shared by other PR work, so rewriting its history is unsafe.
    (msg) => msg.trim() === "all work done",
    // Exempt the two already-pushed CSP commits whose subjects lack conventional types.
    // Do not rewrite shared branch history just to change their commit messages.
    (msg) =>
      msg.trim() === "Cover safe CSP violation telemetry fields" ||
      msg.trim() === "Fix safe CSP violation telemetry logging",
    // Skip Freebuff bot commits, whose subject is a generated file-change summary
    (msg) => /^\s*Update\s+\d+\s+files/i.test(msg) && /Freebuff Agent/i.test(msg),
  ],
};
