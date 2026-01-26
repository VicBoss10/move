import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, Chart as ChartJS, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler } from 'chart.js';

// Registrar los scales y elementos
ChartJS.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

/**
 * Componente que muestra un gráfico de línea comparativo de partículas
 * PM2.5 y PM10 en las últimas 24 horas. Mediciones en µg/m³.
 * 
 * @selector app-particles-chart
 * @standalone true
 * @imports CommonModule, BaseChartDirective
 * @param None
 * @returns Gráfico interactivo de comparación de partículas
 */
@Component({
  selector: 'app-particles-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './particles-chart.component.html',
})
export class ParticlesChartComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  // Datos de las últimas 24 horas
  timeLabels: string[] = [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
  ];

  // Datos simulados en µg/m³ (reemplazar con backend)
  pm25Data: number[] = [28, 30, 32, 35, 38, 40, 42, 45, 48, 52, 55, 58, 60, 62, 65, 63, 61, 58, 55, 52, 48, 45, 40, 35];
  
  pm10Data: number[] = [45, 48, 50, 55, 60, 65, 70, 75, 80, 85, 90, 92, 95, 98, 100, 98, 95, 92, 88, 85, 80, 75, 70, 65];

  chartData: ChartConfiguration<'line'>['data'] = {
    labels: this.timeLabels,
    datasets: [
      {
        label: 'PM2.5 (µg/m³)',
        data: this.pm25Data,
        borderColor: '#6366f1', // índigo
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y',
      },
      {
        label: 'PM10 (µg/m³)',
        data: this.pm10Data,
        borderColor: '#f97316', // naranja
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#f97316',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y',
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
            return label + ': ' + (value !== null ? value.toFixed(1) : 'N/A');
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
          text: 'Partículas (µg/m³)',
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
    // this.environmentService.getParticlesData().subscribe(data => {
    //   this.chartData.datasets[0].data = data.pm25;
    //   this.chartData.datasets[1].data = data.pm10;
    //   this.chart?.update();
    // });
  }
}
