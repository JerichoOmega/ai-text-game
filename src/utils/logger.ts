/**
 * Every `console.warn`/`console.error` in the app should go through here
 * instead of being called directly — before this existed, AudioManager,
 * MusicDirector, UISoundManager, EventBus, and EventEngine each hand-wrote
 * their own `console.error(\`[SystemName] message:\`, err)` format
 * independently. That's the same problem as HapticManager/AudioManager
 * solved for their domains, applied to logging itself.
 *
 * Deliberately a thin wrapper around `console`, not a new logging
 * framework — no batching, no remote reporting, no log levels beyond
 * warn/error/debug. If Chronicle ever needs crash reporting (Sentry or
 * similar), this is the one place that integration gets added; every call
 * site above it (dozens, across systems/ and presentation/) stays
 * unchanged.
 */

function format(scope: string, message: string): string {
  return `[${scope}] ${message}`;
}

export const Logger = {
  /** Recoverable, expected failure modes (a missing asset, an unsupported
   * platform, a no-op cue) — visible in dev, silent in production so it
   * doesn't spam a real user's device console. */
  warn(scope: string, message: string, err?: unknown): void {
    if (!__DEV__) return;
    if (err !== undefined) {
      console.warn(format(scope, message), err);
    } else {
      console.warn(format(scope, message));
    }
  },

  /** Something actually went wrong — logged in both dev and production
   * (production logging today just means "visible if a device log is
   * pulled," since no remote crash reporting is wired up; see file doc). */
  error(scope: string, message: string, err?: unknown): void {
    if (err !== undefined) {
      console.error(format(scope, message), err);
    } else {
      console.error(format(scope, message));
    }
  },

  /** Dev-only diagnostic noise — never shown in production, never even
   * evaluated if a caller builds an expensive message string, since the
   * check happens before format() is called. */
  debug(scope: string, message: string): void {
    if (!__DEV__) return;
    console.log(format(scope, message));
  },
};
