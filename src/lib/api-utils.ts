export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const errorData = await response.json();
      throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
    } else {
      const errorText = await response.text();
      console.error("Non-JSON API error response:", errorText);
      throw new Error(`Server error: ${response.status} ${response.statusText}. Check console for details.`);
    }
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  } else {
    const responseText = await response.text();
    console.error("Expected JSON but received non-JSON response:", responseText);
    throw new Error(`API Error: Expected JSON response but received ${contentType || 'unknown type'}. Check console for details.`);
  }
}