import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface GasIndicator {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  threshold: { good: number; moderate: number; poor: number };
  status: 'good' | 'moderate' | 'poor';
  color: string;
}

@Component({
  selector: 'app-gas-indicators',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gas-indicators.component.html',
})
export class GasIndicatorsComponent implements OnInit {

  gasIndicators: GasIndicator[] = [
    {
      label: 'CO₂',
      value: 450,
      unit: 'ppm',
      min: 300,
      max: 1000,
      threshold: { good: 400, moderate: 600, poor: 1000 },
      status: 'moderate',
      color: '#ef4444', // rojo
    },
    {
      label: 'CO',
      value: 2.655,
      unit: 'ppm',
      min: 0,
      max: 50,
      threshold: { good: 5, moderate: 15, poor: 50 },
      status: 'good',
      color: '#10b981', // verde
    },
    {
      label: 'NO₂',
      value: 2.772,
      unit: 'ppb',
      min: 0,
      max: 200,
      threshold: { good: 50, moderate: 100, poor: 200 },
      status: 'good',
      color: '#3b82f6', // azul
    },
    {
      label: 'NH₃',
      value: 2.697,
      unit: 'ppb',
      min: 0,
      max: 100,
      threshold: { good: 20, moderate: 50, poor: 100 },
      status: 'good',
      color: '#f59e0b', // ámbar
    },
  ];

  ngOnInit() {
    // Actualizar status basado en valores
    this.updateStatus();
  }

  updateStatus() {
    this.gasIndicators.forEach(gas => {
      if (gas.value <= gas.threshold.good) {
        gas.status = 'good';
      } else if (gas.value <= gas.threshold.moderate) {
        gas.status = 'moderate';
      } else {
        gas.status = 'poor';
      }
    });
  }

  getPercentage(gas: GasIndicator): number {
    return ((gas.value - gas.min) / (gas.max - gas.min)) * 100;
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'good':
        return 'Bueno';
      case 'moderate':
        return 'Moderado';
      case 'poor':
        return 'Pobre';
      default:
        return 'Desconocido';
    }
  }

  getStatusBgColor(status: string): string {
    switch (status) {
      case 'good':
        return 'bg-green-100 dark:bg-green-900/20';
      case 'moderate':
        return 'bg-yellow-100 dark:bg-yellow-900/20';
      case 'poor':
        return 'bg-red-100 dark:bg-red-900/20';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20';
    }
  }

  getStatusTextColor(status: string): string {
    switch (status) {
      case 'good':
        return 'text-green-700 dark:text-green-400';
      case 'moderate':
        return 'text-yellow-700 dark:text-yellow-400';
      case 'poor':
        return 'text-red-700 dark:text-red-400';
      default:
        return 'text-gray-700 dark:text-gray-400';
    }
  }

  // Calcula el ángulo para el SVG gauge
  getGaugeAngle(percentage: number): number {
    // 0% = -180°, 100% = 180° (semicírculo)
    return (percentage / 100) * 360 - 180;
  }

  // Convierte ángulo a coordenadas SVG
  getArcPath(angle: number, radius: number = 45): string {
    const startAngle = -180;
    const endAngle = angle;
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = 50 + radius * Math.cos(startRad);
    const y1 = 50 + radius * Math.sin(startRad);
    const x2 = 50 + radius * Math.cos(endRad);
    const y2 = 50 + radius * Math.sin(endRad);
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  getBackgroundArcPath(radius: number = 45): string {
    const startAngle = -180;
    const endAngle = 180;
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = 50 + radius * Math.cos(startRad);
    const y1 = 50 + radius * Math.sin(startRad);
    const x2 = 50 + radius * Math.cos(endRad);
    const y2 = 50 + radius * Math.sin(endRad);
    
    return `M ${x1} ${y1} A ${radius} ${radius} 0 1 1 ${x2} ${y2}`;
  }
}
