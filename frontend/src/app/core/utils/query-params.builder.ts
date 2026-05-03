/**
 * Builder utility for constructing HTTP query parameters in a fluent interface.
 * Reduces code duplication across services by centralizing parameter construction logic.
 * Supports chaining for concise, readable parameter building.
 *
 * @class QueryParamsBuilder
 * @example
 * const params = new QueryParamsBuilder()
 *   .addIfPresent('name', 'test')
 *   .addRange('temperature', 15, 25)
 *   .addDateRange(startDate, endDate)
 *   .build();
 */
export class QueryParamsBuilder {
  private params: { [key: string]: string } = {};

  /**
   * Adds a parameter to the query string if the value is present and non-empty.
   * Ignores null, undefined, and empty string values.
   *
   * @param {string} key - Parameter name.
   * @param {any} value - Parameter value to be converted to string.
   * @returns {QueryParamsBuilder} This instance for method chaining.
   */
  addIfPresent(key: string, value: unknown): this {
    if (value !== null && value !== undefined && value !== '') {
      this.params[key] = this.convertToString(value);
    }
    return this;
  }

  /**
   * Adds minimum and maximum parameters for range-based filtering.
   * Automatically capitalizes the prefix to create minTemperature/maxTemperature style keys.
   * Only includes parameters where min or max values are provided.
   *
   * @param {string} keyPrefix - Base name for the range parameters (e.g., 'temperature').
   * @param {number} [min] - Minimum value; ignored if null or undefined.
   * @param {number} [max] - Maximum value; ignored if null or undefined.
   * @returns {QueryParamsBuilder} This instance for method chaining.
   * @example
   * builder.addRange('temperature', 20, 30) // Creates minTemperature=20&maxTemperature=30
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
   * Adds start and end date parameters for date range filtering.
   * Dates are formatted to local timezone (not UTC) to match database values stored in local time.
   *
   * @param {Date} [start] - Start date (inclusive); ignored if undefined.
   * @param {Date} [end] - End date (inclusive); ignored if undefined.
   * @returns {QueryParamsBuilder} This instance for method chaining.
   */
  addDateRange(start?: Date, end?: Date): this {
    if (start) {
      this.params['start'] = this.formatDateToLocal(start);
    }
    if (end) {
      this.params['end'] = this.formatDateToLocal(end);
    }
    return this;
  }

  /**
   * Formats a date to local timezone ISO 8601 format (YYYY-MM-DDTHH:mm:ss).
   * Uses local time components instead of UTC to ensure consistency with database values.
   *
   * @private
   * @param {Date} date - Date to format.
   * @returns {string} Formatted date string in local time.
   */
  private formatDateToLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  /**
   * Builds and returns the accumulated query parameters object.
   *
   * @returns {Object} Plain object with string keys and values ready for HttpClient.
   */
  build(): { [key: string]: string } {
    return this.params;
  }

  /**
   * Converts any value to a string suitable for query parameters.
   * Handles Date objects by converting to ISO format, complex objects via JSON stringification.
   *
   * @private
   * @param {any} value - Value to convert.
   * @returns {string} String representation of the value.
   */
  private convertToString(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Capitalizes the first character of a string.
   * Used for generating camelCase parameter names (e.g., 'minTemperature').
   *
   * @private
   * @param {string} str - String to capitalize.
   * @returns {string} Capitalized string.
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
