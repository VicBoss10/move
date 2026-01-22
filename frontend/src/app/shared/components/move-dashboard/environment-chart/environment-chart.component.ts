import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, Chart as ChartJS, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler } from 'chart.js';

// Registrar los scales y elementos
ChartJS.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

@Component({
  selector: 'app-environment-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './environment-chart.component.html',
})
export class EnvironmentChartComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  // Datos de las últimas 24 horas
  timeLabels: string[] = [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
  ];

  // Datos simulados (reemplazar con backend)
  co2Data: number[] = [420, 425, 428, 432, 440, 445, 450, 455, 460, 465, 470, 468, 465, 462, 460, 458, 455, 452, 450, 448, 445, 442, 440, 438];
  
  tempData: number[] = [18, 17.8, 17.5, 17.2, 17.0, 17.5, 18.5, 20.0, 22.0, 23.5, 24.0, 24.5, 25.0, 25.5, 25.2, 24.8, 24.5, 24.0, 23.5, 23.0, 22.5, 21.5, 20.0, 19.0];
  
  humidityData: number[] = [72, 73, 74, 75, 76, 77, 75, 73, 70, 68, 65, 63, 62, 60, 61, 62, 63, 65, 67, 69, 70, 71, 71, 71];

  chartData: ChartConfiguration<'line'>['data'] = {
    labels: this.timeLabels,
    datasets: [
      {
        label: 'CO₂ (ppm)',
        data: this.co2Data,
        borderColor: '#ef4444', // rojo
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y',
      },
      {
        label: 'Temperatura (°C)',
        data: this.tempData,
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
        yAxisID: 'y1',
      },
      {
        label: 'Humedad (%)',
        data: this.humidityData,
        borderColor: '#3b82f6', // azul
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y2',
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
          text: 'CO₂ (ppm)',
          color: '#ef4444',
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
          color: '#ef4444',
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'center',
        title: {
          display: true,
          text: 'Temperatura (°C)',
          color: '#f97316',
          font: {
            weight: 'bold',
          },
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#f97316',
        },
      },
      y2: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Humedad (%)',
          color: '#3b82f6',
          font: {
            weight: 'bold',
          },
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#3b82f6',
        },
      },
    },
  };

  ngOnInit() {
    // Aquí conectas con tu servicio backend para obtener datos en tiempo real
    // this.environmentService.getChartData().subscribe(data => {
    //   this.chartData.datasets[0].data = data.co2;
    //   this.chartData.datasets[1].data = data.temperature;
    //   this.chartData.datasets[2].data = data.humidity;
    //   this.chart?.update();
    // });
  }
}
