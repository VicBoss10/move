import { Component, Input } from '@angular/core';

/**
 * Interfaz para cada tarjeta de estadística
 */
export interface StatCard {
  label: string;
  value: string | number;
  icon?: string;
  borderColor: 'red' | 'green' | 'blue' | 'purple' | 'orange' | 'indigo' | 'yellow' | 'gray';
  textColor: string;
}

/**
 * GenericStatsCardsComponent
 *
 * Componente reutilizable para mostrar tarjetas de estadísticas.
 * Elimina duplicación de código en vehicles, cameras, locations.
 *
 * Uso:
 * ```html
 * <app-generic-stats-cards [cards]="statsCards" />
 * ```
 *
 * @standalone true
 * @imports CommonModule
 */
@Component({
  selector: 'app-generic-stats-cards',
  standalone: true,
  imports: [],
  template: `
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      @for (card of cards; track card) {
        <div
          [class]="
            'rounded-lg border-l-4 border-' +
            getBorderColor(card.borderColor) +
            ' bg-white p-4 dark:bg-gray-800'
          "
        >
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            {{ card.label }}
          </p>
          <p class="mt-2 text-2xl font-bold" [class]="'text-' + card.textColor">
            {{ card.value }}
          </p>
        </div>
      }
    </div>
  `,
})
export class GenericStatsCardsComponent {
  /**
   * Array de tarjetas a mostrar
   */
  @Input() cards: StatCard[] = [];

  /**
   * Mapea el color a clase de Tailwind
   */
  getBorderColor(
    color: 'red' | 'green' | 'blue' | 'purple' | 'orange' | 'indigo' | 'yellow' | 'gray',
  ): string {
    const colorMap: Record<string, string> = {
      red: 'red-500',
      green: 'green-500',
      blue: 'blue-500',
      purple: 'purple-500',
      orange: 'orange-500',
      indigo: 'indigo-500',
      yellow: 'yellow-500',
      gray: 'gray-500',
    };
    return colorMap[color] || 'gray-500';
  }
}
