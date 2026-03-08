/**
 * Modelo para Usuario
 */
export interface User {
  id: number;
  email: string;
  username: string;
  role: 'ADMIN' | 'USER' | 'VIEWER';
  /**
   * Puede omitirse o venir null en respuestas parciales.
   */
  createdAt?: Date | null;
}

/**
 * Criterios de búsqueda para usuarios
 */
export interface UserSearchCriteria {
  role?: 'ADMIN' | 'USER' | 'VIEWER';
  keyword?: string;
}

/**
 * Estadísticas de usuarios
 */
export interface UserStats {
  total: number;
  byRole: {
    admin: number;
    user: number;
    viewer: number;
  };
  lastUpdated: Date;
}
