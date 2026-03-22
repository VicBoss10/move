import { Component, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { map, catchError, shareReplay, takeUntil } from 'rxjs/operators';
import { LocationService } from '../../../../core/services/location.service';
import { DeviceService } from '../../../../core/services/device.service';
import { ApiService } from '../../../../core/services/api.service';
import { DeviceState, DeviceType, RegisterDeviceRequest } from '../../../../core/models/device.model';
import { ToastService } from '../../../../core/services/toast.service';

/**
 * RegisterDeviceFormComponent (Shared/Smart Component)
 *
 * Componente para registrar cámaras y sensores en el sistema.
 * Maneja toda la lógica del formulario dinámico.
 *
 * @selector app-register-device-form
 * @standalone true
 */
@Component({
  selector: 'app-register-device-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './register-device-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterDeviceFormComponent implements OnDestroy {
  private destroy$ = new Subject<void>();
  // BLE state
  isBleConnecting$ = new BehaviorSubject<boolean>(false);
  bleDeviceName: string | null = null;
  bleMac: string | null = null;
  bleFirmware: string | null = null;
  bleDevice: any = null;
  bleServer: any = null;

  // Replace these UUIDs with the actual service/characteristic UUIDs used by the ESP32 firmware
  private SENSOR_INFO_SERVICE_UUID = '0000feed-0000-1000-8000-00805f9b34fb';
  private MAC_CHAR_UUID = '0000feed-0001-1000-8000-00805f9b34fb';
  private FIRMWARE_CHAR_UUID = '0000feed-0002-1000-8000-00805f9b34fb';
  private PROVISIONING_SERVICE_UUID = '0000beef-0000-1000-8000-00805f9b34fb';
  private PROVISIONING_CHAR_UUID = '0000beef-0001-1000-8000-00805f9b34fb';

  deviceForm: FormGroup;
  isLoading$ = new BehaviorSubject<boolean>(false);
  successMessage$ = new BehaviorSubject<string | null>(null);
  errorMessage$ = new BehaviorSubject<string | null>(null);
  selectedType$ = new BehaviorSubject<string>('');

  locations$: Observable<any[]>;

  deviceTypes = [
    { id: 'CAMERA', label: 'Cámara/Video' },
    { id: 'SENSOR', label: 'Sensor Ambiental' },
  ];

  streamTypes = [
    { id: 'RTSP', label: 'RTSP Stream', description: 'Protocolo de streaming en tiempo real' },
    { id: 'URL', label: 'HTTP/HTTPS URL', description: 'Imagen o video vía HTTP' },
    { id: 'USB', label: 'Dispositivo USB', description: 'Cámara USB conectada' },
    { id: 'YOUTUBE', label: 'YouTube', description: 'Stream de YouTube' },
  ];

  states = [
    { id: 'ACTIVE', label: 'Activo', color: 'green' },
    { id: 'INACTIVE', label: 'Inactivo', color: 'gray' },
    { id: 'FAILING', label: 'Fallando', color: 'red' },
  ];

  constructor(
    private fb: FormBuilder,
    private locationService: LocationService,
    private deviceService: DeviceService,
    private apiService: ApiService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.deviceForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100), this.trimmedTextValidator()]],
      type: ['', Validators.required],
      locationId: ['', [Validators.required, this.positiveIntegerValidator()]],
      state: ['ACTIVE', Validators.required],
      streamType: [''],
      source: ['', [this.sourceByStreamTypeValidator()]],
      // Sensor fields
      macAddress: ['', []],
      firmwareVersion: ['', []],
      wifiSsid: ['', []],
      wifiPassword: ['', []],
    });

    this.locations$ = this.locationService.getAll().pipe(
      map((locations) => locations),
      catchError((error) => {
        console.error('Error loading locations:', error);
        return of([] as any[]);
      }),
      shareReplay(1)
    );

    this.deviceForm.get('type')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe((type) => {
      this.selectedType$.next(type);
      this.updateValidators(type);
    });
  }

  deselectBleDevice(): void {
    this.bleDeviceName = null;
    this.bleMac = null;
    this.bleFirmware = null;
    if (this.bleDevice && this.bleDevice.gatt && this.bleDevice.gatt.connected) {
      try { this.bleDevice.gatt.disconnect(); } catch {}
    }
    this.bleDevice = null;
    this.bleServer = null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicia el flujo de búsqueda/conexión al dispositivo vía Web Bluetooth.
   * Nota: `navigator.bluetooth.requestDevice` abre el chooser del navegador;
   * no es posible listar dispositivos programáticamente sin intervención del usuario.
   */
  async findAndConnectDevice(): Promise<void> {
    if (!(navigator as any).bluetooth) {
      this.errorMessage$.next('Web Bluetooth no está disponible en este navegador.');
      return;
    }

    try {
      this.isBleConnecting$.next(true);
      // Solicita al usuario seleccionar el dispositivo. Ajustar filtros según firmware.
      const device = await (navigator as any).bluetooth.requestDevice({
        // Use `filters` with the real service UUID when esté disponible
        acceptAllDevices: true,
        optionalServices: [this.SENSOR_INFO_SERVICE_UUID, this.PROVISIONING_SERVICE_UUID]
      });

      this.bleDevice = device as any;
      this.bleDeviceName = this.bleDevice.name || this.bleDevice.id;

      this.bleServer = await this.bleDevice.gatt?.connect() || null;

      // Leer servicio de información del sensor
      const infoService = await this.bleServer?.getPrimaryService(this.SENSOR_INFO_SERVICE_UUID as any);
      if (infoService) {
        const macChar = await infoService.getCharacteristic(this.MAC_CHAR_UUID as any);
        const macValue = await macChar.readValue();
        this.bleMac = this.decodeText(macValue);

        const fwChar = await infoService.getCharacteristic(this.FIRMWARE_CHAR_UUID as any);
        const fwValue = await fwChar.readValue();
        this.bleFirmware = this.decodeText(fwValue);

        // Patch form with values read from device
        this.deviceForm.patchValue({
          macAddress: this.bleMac,
          firmwareVersion: this.bleFirmware
        });
      }

      this.isBleConnecting$.next(false);
      this.successMessage$.next('Dispositivo BLE conectado. Completa el formulario y confirma.');
    } catch (err: any) {
      console.error('BLE error:', err);
      this.isBleConnecting$.next(false);
      this.errorMessage$.next('No se pudo conectar al dispositivo BLE: ' + (err?.message || err));
    }
  }

  private decodeText(dataView: DataView): string {
    try {
      const decoder = new TextDecoder();
      return decoder.decode(dataView);
    } catch {
      // Fallback: read bytes
      let s = '';
      for (let i = 0; i < dataView.byteLength; i++) s += String.fromCharCode(dataView.getUint8(i));
      return s;
    }
  }

  /**
   * Escribe las credenciales de provisioning en el dispositivo vía BLE.
   * payload: objeto con clientId, clientSecret, deviceId, endpoint, wifiSsid, wifiPassword
   */
  private async writeProvisioningToDevice(payload: any): Promise<void> {
    if (!this.bleServer) throw new Error('No BLE server connected');

    try {
      const provService = await this.bleServer.getPrimaryService(this.PROVISIONING_SERVICE_UUID as any);
      const provChar = await provService.getCharacteristic(this.PROVISIONING_CHAR_UUID as any);

      const encoder = new TextEncoder();
      const json = JSON.stringify(payload);
      const data = encoder.encode(json);

      // Escribir en chunks si necesario. Aquí un writeValue sencillo.
      await provChar.writeValue(data);
    } catch (e) {
      console.error('Error writing provisioning data:', e);
      throw e;
    }
  }

  private updateValidators(type: string): void {
    const streamTypeControl = this.deviceForm.get('streamType');
    const sourceControl = this.deviceForm.get('source');
    const macControl = this.deviceForm.get('macAddress');
    const firmwareControl = this.deviceForm.get('firmwareVersion');
    const wifiSsidControl = this.deviceForm.get('wifiSsid');
    const wifiPwdControl = this.deviceForm.get('wifiPassword');

    if (type === 'CAMERA') {
      streamTypeControl?.setValidators([Validators.required]);
      sourceControl?.setValidators([
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(500),
        this.sourceByStreamTypeValidator(),
      ]);
    } else {
      streamTypeControl?.clearValidators();
      sourceControl?.clearValidators();
      // sensor validators
      macControl?.clearValidators();
      firmwareControl?.clearValidators();
      wifiSsidControl?.clearValidators();
      wifiPwdControl?.clearValidators();
    }

    streamTypeControl?.updateValueAndValidity();
    sourceControl?.updateValueAndValidity();
    macControl?.updateValueAndValidity();
    firmwareControl?.updateValueAndValidity();
    wifiSsidControl?.updateValueAndValidity();
    wifiPwdControl?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (!this.deviceForm.valid) {
      this.errorMessage$.next('Por favor, completa todos los campos requeridos correctamente.');
      return;
    }

    this.isLoading$.next(true);
    this.errorMessage$.next(null);
    this.successMessage$.next(null);

    const formValue = this.deviceForm.value;
    const baseData = {
      name: String(formValue.name).trim(),
      type: formValue.type as DeviceType,
      state: (formValue.state as DeviceState) || DeviceState.ACTIVE,
      locationId: Number(formValue.locationId),
    };

    let payload: any;

    if (baseData.type === DeviceType.CAMERA) {
      payload = {
        ...baseData,
        type: DeviceType.CAMERA,
        streamType: formValue.streamType,
        source: String(formValue.source).trim(),
      };
    } else {
      payload = {
        ...baseData,
        type: DeviceType.SENSOR,
        macAddress: String(formValue.macAddress || '').trim(),
        firmwareVersion: String(formValue.firmwareVersion || '').trim(),
        wifiSsid: formValue.wifiSsid || null,
        wifiPassword: formValue.wifiPassword || null,
      };
    }

    this.deviceService.register(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.isLoading$.next(false);
        const typeName = formValue.type === 'CAMERA' ? 'Cámara' : 'Sensor';
        this.successMessage$.next(`${typeName} registrado(a) exitosamente`);
        this.toastService.success(`${typeName} registrado(a) exitosamente`, 'Éxito');

        // Si vienen credenciales Keycloak para sensor, mostrarlas (inmediatamente para provisioning)
        if (response?.keycloakClientInfo) {
          const kc = response.keycloakClientInfo;
          this.successMessage$.next(`Credenciales Keycloak creadas. clientId: ${kc.clientId}`);

          // Intentar escribir las credenciales al dispositivo vía BLE (si está conectado)
          if (this.bleServer && this.bleServer.connected) {
            const provisioningPayload = {
              clientId: kc.clientId,
              clientSecret: kc.clientSecret,
              deviceId: response.deviceId,
              endpoint: this.apiService.getApiUrl(),
              wifiSsid: payload.wifiSsid || null,
              wifiPassword: payload.wifiPassword || null,
            };

            this.writeProvisioningToDevice(provisioningPayload).then(() => {
              this.toastService.success('Credenciales enviadas al dispositivo via BLE', 'Provisioning');
            }).catch((e) => {
              console.error('Provisioning BLE failed:', e);
              this.toastService.error('No se pudieron enviar credenciales vía BLE', 'Provisioning');
            });
          }
        }

        setTimeout(() => {
          this.router.navigate(['/dashboard/devices/device-status']);
        }, 1400);
      },
      error: (error: any) => {
        this.isLoading$.next(false);
        const errorMsg = error?.message || 'Error al registrar el dispositivo';
        this.errorMessage$.next(errorMsg);
        this.toastService.error(errorMsg, 'Error');
        console.error('Error registering device:', error);
      }
    });
  }

  resetForm(): void {
    this.deviceForm.reset({ state: 'ACTIVE' });
    this.selectedType$.next('');
    this.errorMessage$.next(null);
    this.successMessage$.next(null);
  }

  canSubmit(): boolean {
    return this.deviceForm.valid && !this.isLoading$.value;
  }

  getStreamTypeDescription(streamTypeId: string): string {
    return this.streamTypes.find((st) => st.id === streamTypeId)?.description || '';
  }

  /**
   * Evita valores vacíos con espacios y normaliza campos de texto.
   */
  private trimmedTextValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (typeof value !== 'string') {
        return null;
      }

      if (value.length > 0 && value.trim().length === 0) {
        return { blankValue: true };
      }

      return null;
    };
  }

  /**
   * Valida que locationId sea un entero positivo.
   */
  private positiveIntegerValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === undefined || control.value === '') {
        return null;
      }

      const parsed = Number(control.value);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return { positiveInteger: true };
      }

      return null;
    };
  }

  /**
   * Valida el campo source según el streamType elegido.
   */
  private sourceByStreamTypeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const sourceValue = control.value;
      if (!sourceValue || typeof sourceValue !== 'string') {
        return null;
      }

      const streamType = control.parent?.get('streamType')?.value;
      const source = sourceValue.trim();

      if (!streamType) {
        return null;
      }

      if (streamType === 'RTSP') {
        return source.toLowerCase().startsWith('rtsp://') ? null : { invalidRtspSource: true };
      }

      if (streamType === 'URL') {
        return this.isValidHttpUrl(source) ? null : { invalidHttpSource: true };
      }

      if (streamType === 'YOUTUBE') {
        const isYouTube = this.isValidHttpUrl(source) && /(youtube\.com|youtu\.be)/i.test(source);
        return isYouTube ? null : { invalidYouTubeSource: true };
      }

      if (streamType === 'USB') {
        const isUsbIndex = /^\d+$/.test(source);
        const isLinuxDevice = /^\/dev\/video\d+$/i.test(source);
        return isUsbIndex || isLinuxDevice ? null : { invalidUsbSource: true };
      }

      return null;
    };
  }

  private isValidHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
