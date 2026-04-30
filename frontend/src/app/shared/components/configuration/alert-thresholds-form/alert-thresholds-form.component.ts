import { Component, ChangeDetectionStrategy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ThresholdsService } from '../../../../core/services/thresholds.service';
import {
  ENV_THRESHOLDS,
  EnvironmentMetricKey,
  MetricThresholdConfig,
  ThresholdLevel,
} from '../../../../core/config/environment-thresholds.config';
import { ToastService } from '../../../../core/services/toast.service';

/**
 * AlertThresholdsFormComponent
 *
 * Componente encargado de mostrar y editar los umbrales de alerta
 * para las métricas ambientales (CO₂, PM2.5, temperatura, etc.).
 * Permite seleccionar una métrica, editar sus niveles (max) y
 * persistir overrides en `localStorage` a través de `ThresholdsService`.
 *
 * - Valida que los umbrales estén en orden creciente (nivel n > nivel n-1)
 * - Guarda/Restablece los valores y notifica con `ToastService`
 *
 * @selector app-alert-thresholds-form
 * @standalone true
 */
@Component({
  selector: 'app-alert-thresholds-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './alert-thresholds-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertThresholdsFormComponent implements OnInit {
  metrics: EnvironmentMetricKey[] = Object.keys(ENV_THRESHOLDS) as EnvironmentMetricKey[];
  selected: EnvironmentMetricKey = 'co2';
  form: FormGroup;
  public envThresholds = ENV_THRESHOLDS;

  constructor(
    private fb: FormBuilder,
    private thresholds: ThresholdsService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.createEmptyForm();
  }

  ngOnInit(): void {
    this.buildFormFor(this.selected);
  }

  private createEmptyForm(): FormGroup {
    return this.fb.group({
      metric: ['co2', Validators.required],
      levels: this.fb.array([]),
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByMetric(metric: EnvironmentMetricKey): string {
    return metric;
  }

  /**
   * Construye el formulario para la métrica seleccionada usando los
   * umbrales actualmente cargados desde `ThresholdsService`.
   * Incluye todos los niveles pero marcará el último como solo lectura en el HTML.
   * @param metric - Clave de la métrica (co2, pm25, temperature, ...)
   */
  buildFormFor(metric: EnvironmentMetricKey) {
    const cfg = this.thresholds.getMetric(metric) as MetricThresholdConfig;
    this.form = this.fb.group({
      metric: [metric, Validators.required],
      levels: this.fb.array(cfg.levels.map((l: ThresholdLevel) => this.levelGroup(l))),
    });
    this.selected = metric;
    this.cdr.markForCheck();
  }

  /**
   * Crea un FormGroup para un nivel de un umbral individual.
   * Si es el nivel Crítico (marcado con max: Infinity), lo dejamos como null
   * y sin validadores obligatorios ya que no se edita.
   * @param level - Configuración del nivel (max, key, label)
   */
  levelGroup(level: ThresholdLevel) {
    const isInfinity = level.max === Infinity;
    return this.fb.group({
      max: [
        isInfinity ? null : level.max,
        isInfinity ? [] : [Validators.required, Validators.min(0)],
      ],
      key: [level.key],
      label: [level.label],
    });
  }

  get levels(): FormArray {
    return this.form.get('levels') as FormArray;
  }

  /** Selecciona una métrica diferente y reconstruye el formulario. */
  selectMetric(metric: EnvironmentMetricKey) {
    this.buildFormFor(metric);
  }

  /**
   * Valida que los valores `max` de los niveles editables sean estrictamente crecientes.
   * Devuelve null si es válido o un mensaje de error en caso contrario.
   */
  validateOrder(): string | null {
    // Solo validamos hasta el penúltimo, ya que el último es Infinity (null en form)
    const values = this.levels.controls
      .map((c) => c.get('max')?.value)
      .filter((v) => v !== null)
      .map((v) => Number(v));

    for (let i = 1; i < values.length; i++) {
      if (isNaN(values[i]) || isNaN(values[i - 1]))
        return 'Todos los umbrales deben ser números válidos';
      if (values[i] <= values[i - 1]) {
        return `El nivel ${i} debe ser mayor que el nivel ${i - 1}`;
      }
    }
    return null;
  }

  /**
   * Persiste los cambios validados en `ThresholdsService`.
   * Mapea los controles del formulario a la estructura `ThresholdLevel`.
   */
  save() {
    const err = this.validateOrder();
    if (err) {
      this.toast.error(err, 'Validación');
      return;
    }
    const cfg = this.thresholds.getMetric(this.selected);

    cfg.levels = this.levels.controls.map((c) => {
      const isLast = c.get('key')?.value === 'critical';
      return {
        key: c.get('key')?.value,
        label: c.get('label')?.value,
        max: isLast ? Infinity : Number(c.get('max')?.value),
        color:
          cfg.levels.find((l: ThresholdLevel) => l.key === c.get('key')?.value)?.color || '#999',
        textClass:
          cfg.levels.find((l: ThresholdLevel) => l.key === c.get('key')?.value)?.textClass || '',
        bgClass:
          cfg.levels.find((l: ThresholdLevel) => l.key === c.get('key')?.value)?.bgClass || '',
        gaugeGradient:
          cfg.levels.find((l: ThresholdLevel) => l.key === c.get('key')?.value)?.gaugeGradient ||
          '',
      } as ThresholdLevel;
    });

    this.thresholds.updateMetric(this.selected, cfg);
    this.toast.success('Umbrales actualizados', 'Éxito');
    this.cdr.markForCheck();
  }

  reset() {
    this.thresholds.reset();
    this.buildFormFor(this.selected);
    this.toast.success('Umbrales restaurados a valores predeterminados', 'Restaurado');
  }

  /**
   * Devuelve la clase CSS del color para el indicador de nivel
   * basado en el índice del nivel en la lista.
   * @param index - Índice del nivel (0=good, 1=moderate, 2=poor, etc.)
   */
  getLevelColorClass(index: number): string {
    const colors = [
      'bg-green-500', // good
      'bg-yellow-500', // moderate
      'bg-orange-500', // poor
      'bg-red-500', // critical
    ];
    return colors[index] || 'bg-gray-500';
  }
}
