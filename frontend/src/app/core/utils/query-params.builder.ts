/**
 * Constructor de parámetros de query reutilizable
 * Reduce duplicación entre servicios al construir queryParams
 * 
 * @utility
 */
export class QueryParamsBuilder {
  private params: { [key: string]: string } = {};

  /**
   * Agrega un parámetro si el valor existe
   * @param key - Nombre del parámetro
   * @param value - Valor (se ignora si es null/undefined)
   * @returns this para chainable pattern
   */
  addIfPresent(key: string, value: any): this {
    if (value !== null && value !== undefined && value !== '') {
      this.params[key] = this.convertToString(value);
    }
    return this;
  }

  /**
   * Agrega un rango numérico (min/max)
   * @param keyPrefix - Prefijo de las claves ("temperature" → "minTemperature", "maxTemperature")
   * @param min - Valor mínimo
   * @param max - Valor máximo
   * @returns this para chainable pattern
   */
  addRange(keyPrefix: string, min?: number, max?: number): this {
    if (min !== null && min !== undefined) {
      this.params[`min${this.capitalize(keyPrefix)}`] = min.toString();
    }
    if (max !== null && max !== undefined) {
      this.params[`max${this.capitalize(keyPrefix)}`] = max.toString();
    }
    return this;
  }

  /**
   * Agrega un rango de fechas
   * @param start - Fecha inicial
   * @param end - Fecha final
   * @returns this para chainable pattern
   */
  addDateRange(start?: Date, end?: Date): this {
    if (start) {
      this.params['start'] = start.toISOString();
    }
    if (end) {
      this.params['end'] = end.toISOString();
    }
    return this;
  }

  /**
   * Construye el objeto de parámetros
   * @returns Objeto con parámetros de query
   */
  build(): { [key: string]: string } {
    return this.params;
  }

  /**
   * Convierte valores a string para HttpClient
   */
  private convertToString(value: any): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Capitaliza la primera letra
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
