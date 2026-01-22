import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, Chart as ChartJS, BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js';

// Registrar los elementos de Chart.js
ChartJS.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend);

@Component({
  selector: 'app-vehicle-activity',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './vehicle-activity.component.html',
})
export class VehicleActivityComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  // Datos de vehículos detectados
  vehicleTypes: string[] = ['Carros', 'Motos', 'Buses', 'Camiones'];
  vehicleCounts: number[] = [82, 31, 10, 5];

  chartData: ChartConfiguration<'bar'>['data'] = {
    labels: this.vehicleTypes,
    datasets: [
      {
        label: 'Cantidad de Vehículos',
        data: this.vehicleCounts,
        backgroundColor: [
          '#3b82f6', // Azul para Carros
          '#10b981', // Verde para Motos
          '#f97316', // Naranja para Buses
          '#ef4444', // Rojo para Camiones
        ],
        borderColor: [
          '#1e40af',
          '#059669',
          '#ea580c',
          '#dc2626',
        ],
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  chartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
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
            const value = context.parsed.x;
            return 'Detectados: ' + value;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: false,
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
        },
        title: {
          display: true,
          text: 'Cantidad',
          color: '#6B7280',
        },
      },
      y: {
        stacked: false,
        display: true,
        grid: {
          display: false,
          drawOnChartArea: false,
          drawTicks: false,
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 12,
            weight: '500' as any,
          },
        },
      },
    },
  };

  ngOnInit() {
    // Aquí conectas con tu servicio backend para obtener datos en tiempo real
    // this.vehicleService.getVehicleActivity().subscribe(data => {
    //   this.chartData.datasets[0].data = data.counts;
    //   this.chart?.update();
    // });
  }
}
