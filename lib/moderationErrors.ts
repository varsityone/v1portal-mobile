export function messageSendError(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
  if (code === 'PVM01') return 'Messaging is unavailable because one of you has blocked the other.';
  if (code === 'PVM02') return 'This text contains language that is not allowed. Please edit it and try again.';
  return 'Unable to send. Please try again.';
}
