/**
 * Validates whether a given string is a valid HTTP or HTTPS URL using the native URL constructor.
 * Accepts standard HTTP/HTTPS URLs including query parameters, fragments, and special characters.
 */
export function isValidUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString.trim());
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}
