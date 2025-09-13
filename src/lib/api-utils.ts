import { toast } from "sonner";

interface FetcherOptions extends RequestInit {
  errorMessage?: string;
}

// Define a generic API response structure
interface ApiResponse<T> {
  success: boolean;
  error?: string;
  message?: string; // For general messages, not necessarily errors
  data?: T; // The actual data if success is true
  // Allow for other properties like jobId, duplicates, etc.
  [key: string]: any; 
}

export async function apiFetcher<T>(url: string, options?: FetcherOptions): Promise<T> {
  const { errorMessage = "An unexpected error occurred.", ...fetchOptions } = options || {};

  try {
    const response = await fetch(url, fetchOptions);

    const contentType = response.headers.get("Content-Type");
    const isJson = contentType?.includes("application/json");

    let responseData: ApiResponse<T> | string;

    if (isJson) {
      responseData = await response.json() as ApiResponse<T>;
    } else {
      responseData = await response.text();
      console.error(`API Error (${response.status}) from ${url}: Non-JSON response received.`);
      console.error("Raw response body (first 200 chars):", (responseData as string).substring(0, 200));
      toast.error(`${errorMessage} (Status: ${response.status}). Received non-JSON response.`);
      throw new Error(`${errorMessage} (Status: ${response.status}). Received non-JSON response. Body: ${(responseData as string).substring(0, 200)}...`);
    }

    // Check if the HTTP response itself was not OK
    if (!response.ok) {
      const errorMsg = (responseData as ApiResponse<T>).error || (responseData as ApiResponse<T>).message || errorMessage;
      console.error(`API Error (${response.status}) from ${url}:`, responseData);
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    // If HTTP response is OK, but the API's internal 'success' flag is false
    if (typeof responseData === 'object' && 'success' in responseData && responseData.success === false) {
      const errorMsg = responseData.error || responseData.message || errorMessage;
      console.error(`API Logical Error from ${url}:`, responseData);
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    // If everything is successful, return the full response data (which should contain T and other fields)
    return responseData as T;

  } catch (error) {
    console.error(`Network or unexpected error calling ${url}:`, error);
    // Only show a generic network error if a more specific error hasn't been toasted already
    if (!toast.promise) { // Check if a toast is already active from previous error handling
      toast.error(`Network error: ${errorMessage}`);
    }
    throw error; // Re-throw to propagate the error
  }
}