// First tip-off: Thursday March 19 2026 at 12:00 PM ET
// To update for next year, change this value and redeploy.
export const SUBMISSION_DEADLINE = new Date('2026-03-19T12:00:00-05:00');

export const isLocked = () => new Date() >= SUBMISSION_DEADLINE;

export const deadlineLabel = SUBMISSION_DEADLINE.toLocaleString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
  timeZone: 'America/New_York',
});
