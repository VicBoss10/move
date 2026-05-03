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
 * AlertThresholdsFormComponent (Presentational Component)
 *
 * Manages environmental metric alert threshold configuration and persistence.
 * Displays threshold settings for metrics like CO₂, PM2.5, temperature, etc.,
 * allowing users to customize alert level thresholds and save overrides.
 *
 * Features:
 * - Metric selection with reactive form rebuild
 * - Editable threshold max values per alert level (good/moderate/poor/critical)
 * - Progressive validation ensuring strictly ascending threshold values
 * - Reset to factory defaults via ThresholdsService
 * - LocalStorage persistence of custom threshold overrides
 * - Form state tracking with FormArray and reactive change detection
 * - Dark mode support
 * - OnPush change detection with manual ChangeDetectorRef triggers
 *
 * @selector app-alert-thresholds-form
 * @standalone true
 * @imports CommonModule, ReactiveFormsModule
 * @example
 * <app-alert-thresholds-form />
 */
@Component({
  selector: 'app-alert-thresholds-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './alert-thresholds-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertThresholdsFormComponent implements OnInit {
  /**
   * Available environmental metric keys for threshold configuration.
   * @type {EnvironmentMetricKey[]}
   */
  metrics: EnvironmentMetricKey[] = Object.keys(ENV_THRESHOLDS) as EnvironmentMetricKey[];

  /**
   * Currently selected metric being edited.
   * @type {EnvironmentMetricKey}
   */
  selected: EnvironmentMetricKey = 'co2';

  /**
   * Reactive form group containing metric selection and threshold levels FormArray.
   * @type {FormGroup}
   */
  form: FormGroup;

  /**
   * Reference to environment thresholds configuration object for template binding.
   * @type {typeof ENV_THRESHOLDS}
   */
  public envThresholds = ENV_THRESHOLDS;

  /**
   * Initializes component with form builder and service dependencies.
   * @param {FormBuilder} fb - Angular FormBuilder for reactive form creation
   * @param {ThresholdsService} thresholds - Service managing threshold configuration and persistence
   * @param {ToastService} toast - Service for displaying user notifications
   * @param {ChangeDetectorRef} cdr - Change detection reference for manual triggering in OnPush mode
   */
  constructor(
    private fb: FormBuilder,
    private thresholds: ThresholdsService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.createEmptyForm();
  }

  /**
   * Component initialization lifecycle hook.
   * Builds reactive form for the default selected metric.
   */
  ngOnInit(): void {
    this.buildFormFor(this.selected);
  }

  /**
   * Creates an empty form group with metric selection and empty levels FormArray.
   * @returns {FormGroup} Empty reactive form ready for population
   * @private
   */
  private createEmptyForm(): FormGroup {
    return this.fb.group({
      metric: ['co2', Validators.required],
      levels: this.fb.array([]),
    });
  }

  /**
   * TrackBy function for @for loop iteration by index.
   * Optimizes change detection in template loops.
   * @param {number} index - Loop index
   * @returns {number} Index for tracking
   */
  trackByIndex(index: number): number {
    return index;
  }

  /**
   * TrackBy function for @for loop iteration by metric key.
   * Optimizes change detection in template metric selector.
   * @param {EnvironmentMetricKey} metric - Metric key identifier
   * @returns {string} Metric key for tracking
   */
  trackByMetric(metric: EnvironmentMetricKey): string {
    return metric;
  }

  /**
   * Rebuilds reactive form for selected metric.
   * Populates FormArray with threshold level controls from ThresholdsService.
   * Critical level (max: Infinity) is rendered read-only in template.
   * @param {EnvironmentMetricKey} metric - Metric key (co2, pm25, temperature, etc.)
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
   * Creates FormGroup for individual threshold level control.
   * Critical level (marked with max: Infinity) is populated with null and no validators
   * since it is read-only in the template.
   * @param {ThresholdLevel} level - Threshold level configuration (max, key, label, colors)
   * @returns {FormGroup} Form group with max/key/label controls
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

  /**
   * Getter for levels FormArray.
   * @returns {FormArray} Array of threshold level form groups
   */
  get levels(): FormArray {
    return this.form.get('levels') as FormArray;
  }

  /**
   * Selects different metric and rebuilds form with new threshold values.
   * @param {EnvironmentMetricKey} metric - Metric key to select
   */
  selectMetric(metric: EnvironmentMetricKey) {
    this.buildFormFor(metric);
  }

  /**
   * Validates threshold max values are strictly ascending.
   * Skips last level (critical) as it has max: Infinity.
   * @returns {string | null} Error message if invalid, null if all values pass validation
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
   * Persists validated threshold changes to ThresholdsService and localStorage.
   * Maps form controls back to ThresholdLevel structure with original color/gauge properties.
   * Displays success toast on completion.
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

  /**
   * Resets all thresholds to factory defaults via ThresholdsService.
   * Rebuilds form for current metric and displays success notification.
   */
  reset() {
    this.thresholds.reset();
    this.buildFormFor(this.selected);
    this.toast.success('Umbrales restaurados a valores predeterminados', 'Restaurado');
  }

  /**
   * Returns Tailwind color class for threshold level indicator.
   * Maps severity progression from good (green) to critical (red).
   * @param {number} index - Level index (0=good, 1=moderate, 2=poor, 3=critical)
   * @returns {string} Tailwind bg color class
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
