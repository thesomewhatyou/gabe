// Fetch with timeout (15s default)
export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 15000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Try multiple URLs with fallback (for Nitter instances)
export async function fetchWithFallback(urls: string[], options: RequestInit = {}): Promise<Response> {
  const errors: Error[] = [];

  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url, options, 10000); // 10s per instance
      if (response.ok) return response;
      errors.push(new Error(`${url} returned ${response.status}`));
    } catch (error) {
      errors.push(error as Error);
    }
  }

  throw new Error(`All instances failed: ${errors.map((e) => e.message).join(", ")}`);
}
