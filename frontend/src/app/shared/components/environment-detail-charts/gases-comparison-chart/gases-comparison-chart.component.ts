import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, Chart as ChartJS, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler } from 'chart.js';

// Registrar los scales y elementos
ChartJS.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

/**
 * Componente que muestra un gráfico de línea comparativo de múltiples gases
 * (CO, NO₂, NH₃, C₆H₆) en las últimas 24 horas.
 * 
 * @selector app-gases-comparison-chart
 * @standalone true
 * @imports CommonModule, BaseChartDirective
 * @param None
 * @returns Gráfico interactivo de comparación de gases
 */
@Component({
  selector: 'app-gases-comparison-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './gases-comparison-chart.component.html',
})
export class GasesComparisonChartComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  // Datos de las últimas 24 horas
  timeLabels: string[] = [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
  ];

  // Datos simulados en µg/m³ (reemplazar con backend)
  coData: number[] = [1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.0, 2.2, 2.5, 2.8, 3.0, 3.2, 3.5, 3.3, 3.1, 2.9, 2.7, 2.5, 2.3, 2.1, 1.9, 1.7, 1.5];
  
  no2Data: number[] = [45, 48, 50, 52, 55, 58, 60, 65, 70, 75, 80, 82, 85, 88, 86, 84, 82, 78, 75, 72, 68, 65, 60, 55];
  
  nh3Data: number[] = [0.8, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.2, 1.3, 1.4, 1.5, 1.6, 1.65, 1.7, 1.68, 1.65, 1.6, 1.55, 1.5, 1.45, 1.4, 1.35, 1.3, 1.2];
  
  c6h6Data: number[] = [2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.9, 3.1, 3.3, 3.5, 3.7, 3.9, 4.1, 4.0, 3.9, 3.8, 3.6, 3.4, 3.2, 3.0, 2.8, 2.6, 2.4];

  chartData: ChartConfiguration<'line'>['data'] = {
    labels: this.timeLabels,
    datasets: [
      {
        label: 'CO (ppm)',
        data: this.coData,
        borderColor: '#8b5cf6', // púrpura
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#8b5cf6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'NO₂ (µg/m³)',
        data: this.no2Data,
        borderColor: '#f59e0b', // ámbar
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#f59e0b',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'NH₃ (ppb)',
        data: this.nh3Data,
        borderColor: '#06b6d4', // cian
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#06b6d4',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: 'C₆H₆ (µg/m³)',
        data: this.c6h6Data,
        borderColor: '#ec4899', // rosa
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#ec4899',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: 500,
          },
          color: '#6B7280',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return label + ': ' + (value !== null ? value.toFixed(2) : 'N/A');
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: true,
          drawOnChartArea: true,
          drawTicks: false,
          color: 'rgba(107, 114, 128, 0.1)',
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11,
          },
          maxTicksLimit: 12,
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Concentración (µg/m³, ppm, ppb)',
          color: '#6B7280',
          font: {
            weight: 'bold',
          },
        },
        grid: {
          display: true,
          drawOnChartArea: true,
          drawTicks: false,
          color: 'rgba(107, 114, 128, 0.1)',
        },
        ticks: {
          color: '#6B7280',
        },
      },
    },
  };

  ngOnInit() {
    // Aquí conectas con tu servicio backend para obtener datos en tiempo real
    // this.environmentService.getGasesData().subscribe(data => {
    //   this.chartData.datasets[0].data = data.co;
    //   this.chartData.datasets[1].data = data.no2;
    //   this.chartData.datasets[2].data = data.nh3;
    //   this.chartData.datasets[3].data = data.c6h6;
    //   this.chart?.update();
    // });
  }
}
