export function sanitizePlainText(value?: string | null): string | undefined {
  if (value == null) {
    return undefined;
  }

  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}
