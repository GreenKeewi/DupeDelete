import { toast } from "sonner";

interface FetcherOptions extends RequestInit {
  errorMessage?: string;
}

export async function apiFetcher<T>(url: string, options?: FetcherOptions): Promise<T> {
  const { errorMessage = "An unexpected error occurred.", ...fetchOptions } = options || {};

  try {
    const response = await fetch(url, fetchOptions);

    const contentType = response.headers.get("Content-Type");
    const isJson = contentType?.includes("application/json");

    if (!response.ok) {
      let errorData: any;
      if (isJson) {
        errorData = await response.json();
        console.error(`API Error (${response.status}) from ${url}:`, errorData);
        toast.error(errorData.message || errorMessage);
        throw new Error(errorData.message || errorMessage);
      } else {
        const textResponse = await response.text();
        console.error(`API Error (${response.status}) from ${url}: Non-JSON response received.`);
        console.error("Raw response body (first 200 chars):", textResponse.substring(0, 200));
        toast.error(`${errorMessage} (Status: ${response.status}). Received non-JSON response.`);
        throw new Error(`${errorMessage} (Status: ${response.status}). Received non-JSON response. Body: ${textResponse.substring(0, 200)}...`);
      }
    }

    if (isJson) {
      return await response.json() as T;
    } else {
      const textResponse = await response.text();
      console.warn(`API Warning from ${url}: Expected JSON but received non-JSON (Content-Type: ${contentType}).`);
      console.warn("Raw response body (first 200 chars):", textResponse.substring(0, 200));
      // If it's a successful non-JSON response, we might just return it as text or throw if strict JSON is always expected.
      // For this scenario, we'll throw as the user expects JSON.
      toast.error(`${errorMessage}. Expected JSON, but received non-JSON response.`);
      throw new Error(`${errorMessage}. Expected JSON, but received non-JSON response. Body: ${textResponse.substring(0, 200)}...`);
    }
  } catch (error) {
    console.error(`Network or unexpected error calling ${url}:`, error);
    toast.error(`Network error: ${errorMessage}`);
    throw error; // Re-throw to propagate the error
  }
}