/**
 * User entity representing an authenticated user in the system.
 * @interface User
 */
export interface User {
  /** Unique identifier for the user. */
  id: number;
  /** User email address used for authentication. */
  email: string;
  /** Username for display and login purposes. */
  username: string;
  /** User role determining access level (ADMIN, USER, or VIEWER). */
  role: 'ADMIN' | 'USER' | 'VIEWER';
  /** Account creation timestamp, may be undefined in partial responses. */
  createdAt?: Date | null;
}

/**
 * Search criteria filter for user queries.
 * @interface UserSearchCriteria
 */
export interface UserSearchCriteria {
  /** Filter users by role. */
  role?: 'ADMIN' | 'USER' | 'VIEWER';
  /** Search users by keyword (matches username or email). */
  keyword?: string;
}

/**
 * Aggregated user statistics.
 * @interface UserStats
 */
export interface UserStats {
  /** Total number of users in the system. */
  total: number;
  /** User count breakdown by role. */
  byRole: {
    /** Number of admin users. */
    admin: number;
    /** Number of standard users. */
    user: number;
    /** Number of viewer users. */
    viewer: number;
  };
  /** Timestamp when statistics were last calculated. */
  lastUpdated: Date;
}
