/**
 * Normalized error response from backend API calls.
 * Constructed by ApiService.handleError to provide consistent error messaging.
 * @interface ApiError
 */
export interface ApiError {
  /** HTTP status code (e.g., 400, 404, 500). */
  status: number;
  /** Human-readable error message suitable for display to end users. */
  message: string;
  /** Raw error response body from the server, if available. */
  details?: unknown;
}

/**
 * Generic wrapper for paginated response data from backend endpoints.
 * Used when the endpoint returns a page of results rather than all records.
 * @interface Paginated
 * @template T The type of items in the page.
 */
export interface Paginated<T> {
  /** Array of items in the current page. */
  items: T[];
  /** Total number of items across all pages. */
  total: number;
  /** Zero-indexed page number of the current page. */
  page: number;
  /** Number of items per page. */
  size: number;
}

/**
 * OAuth2/Keycloak authentication token response.
 * Returned by the authentication endpoint and used for subsequent API requests.
 * @interface AuthToken
 */
export interface AuthToken {
  /** JWT access token for API authentication. */
  access_token: string;
  /** Token used to obtain a new access token without re-authenticating. */
  refresh_token?: string;
  /** Token expiration time in seconds. */
  expires_in?: number;
  /** Token type (typically "Bearer"). */
  token_type?: string;
  /** Space-separated list of scopes granted to the token. */
  scope?: string;
}
