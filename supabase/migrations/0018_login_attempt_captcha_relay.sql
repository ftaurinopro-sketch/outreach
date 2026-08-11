-- Live CAPTCHA/checkpoint relay for automated LinkedIn login: when the
-- runner's headless browser hits a challenge it can't resolve on its own
-- (see runner/index.js classifyLoginOutcome's "unsupported_challenge"
-- case), instead of giving up immediately it now holds the browser open,
-- reports a screenshot here, and waits for the human account owner to
-- supply the next click/keystroke through the ReachOS UI — the runner
-- never solves the challenge itself, it only relays the real user's own
-- input to the page they're looking at.
alter table login_attempts add column if not exists screenshot text;
alter table login_attempts add column if not exists pending_interaction jsonb;
