import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AsociacionesService } from './asociaciones.service';

export interface LocationSharingConfig {
  uuid: string;
  zona: string;
  userType: string;
  intervalMinutes: number;
  displayName?: string;
  source?: string;
}

export interface LocationSharingState {
  active: boolean;
  intervalMinutes: number;
  lastSentAt: string | null;
  lastError: string | null;
  statusMessage: string;
}

@Injectable({ providedIn: 'root' })
export class LocationSharingService {
  private readonly storageKeys = {
    enabled: 'shareLocationEnabled',
    clientId: 'locationClientId',
    uuid: 'shareLocationUuid',
    zona: 'shareLocationZona',
    userType: 'shareLocationUserType',
    intervalMinutes: 'shareLocationIntervalMinutes',
    displayName: 'shareLocationDisplayName',
    source: 'shareLocationSource',
  };

  private readonly stateSubject = new BehaviorSubject<LocationSharingState>({
    active: false,
    intervalMinutes: 0,
    lastSentAt: null,
    lastError: null,
    statusMessage: 'No estás compartiendo ubicación.',
  });

  readonly state$ = this.stateSubject.asObservable();

  private timerId: ReturnType<typeof setInterval> | null = null;
  private currentConfig: LocationSharingConfig & { clientId: string } | null = null;

  constructor(
    private asociacionesService: AsociacionesService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  getCurrentState(): LocationSharingState {
    return this.stateSubject.value;
  }

  resumeFromStorage(): void {
    if (!this.canRunInBrowser()) return;
    if (localStorage.getItem(this.storageKeys.enabled) !== 'true') return;

    const config = this.readConfigFromStorage();
    if (!config || !this.isAllowedUserType(config.userType)) {
      this.stopSharing(false);
      return;
    }

    this.startSharing(config, false);
  }

  startSharing(config: LocationSharingConfig, persist = true): void {
    if (!this.canRunInBrowser()) return;

    const normalized = this.normalizeConfig(config);
    if (!this.isAllowedUserType(normalized.userType)) {
      this.patchState({
        active: false,
        statusMessage: 'Solo pueden compartir ubicación los perfiles COOR, BOSS y COOR_MAÑANA.',
        lastError: 'Perfil no autorizado para compartir ubicación.',
      });
      return;
    }

    this.clearTimer();

    const clientId = this.getOrCreateClientId();
    this.currentConfig = {
      ...normalized,
      clientId,
    };

    if (persist) {
      this.persistConfig(this.currentConfig);
    }

    this.patchState({
      active: true,
      intervalMinutes: this.currentConfig.intervalMinutes,
      lastError: null,
      statusMessage: `Compartiendo ubicación cada ${this.currentConfig.intervalMinutes} minuto${this.currentConfig.intervalMinutes === 1 ? '' : 's'}.`,
    });

    void this.sendCurrentLocation();
    this.timerId = setInterval(() => void this.sendCurrentLocation(), this.currentConfig.intervalMinutes * 60_000);
  }

  stopSharing(removeRemoteLocation = true): void {
    const config = this.currentConfig ?? this.readConfigFromStorage();

    this.clearTimer();
    this.currentConfig = null;
    this.clearStoredConfig();

    if (removeRemoteLocation && config?.clientId) {
      this.asociacionesService.deleteUbicacionCompartida(config.clientId).subscribe({
        error: () => undefined,
      });
    }

    this.patchState({
      active: false,
      intervalMinutes: 0,
      statusMessage: 'No estás compartiendo ubicación.',
    });
  }

  private async sendCurrentLocation(): Promise<void> {
    const config = this.currentConfig;
    if (!config || !this.canRunInBrowser() || !navigator.geolocation) {
      this.patchState({
        lastError: 'Tu navegador no permite obtener la ubicación.',
        statusMessage: 'No se pudo obtener la ubicación.',
      });
      return;
    }

    const position = await new Promise<GeolocationPosition | null>(resolve => {
      navigator.geolocation.getCurrentPosition(
        pos => resolve(pos),
        error => {
          console.error('Error obteniendo ubicación:', error);
          this.patchState({
            lastError: this.getGeolocationErrorMessage(error),
            statusMessage: 'No se pudo obtener la ubicación.',
          });
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });

    if (!position) return;

    this.asociacionesService.upsertUbicacionCompartida({
      clientId: config.clientId,
      uuid: config.uuid,
      displayName: config.displayName || config.userType || config.uuid,
      zona: config.zona,
      userType: config.userType,
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      source: config.source || 'web',
    }).subscribe({
      next: () => {
        const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.patchState({
          lastSentAt: time,
          lastError: null,
          statusMessage: `Último envío: ${time}.`,
        });
      },
      error: error => {
        console.error('Error enviando ubicación:', error);
        this.patchState({
          lastError: this.getHttpErrorMessage(error),
          statusMessage: 'No se pudo guardar la ubicación en el servidor.',
        });
      }
    });
  }

  private normalizeConfig(config: LocationSharingConfig): LocationSharingConfig {
    return {
      ...config,
      uuid: String(config.uuid || '').trim(),
      zona: String(config.zona || '').trim().toLowerCase(),
      userType: String(config.userType || '').trim().toLowerCase(),
      intervalMinutes: Math.max(1, Math.floor(Number(config.intervalMinutes) || 3)),
      displayName: config.displayName ? String(config.displayName).trim() : undefined,
      source: config.source ? String(config.source).trim() : 'web',
    };
  }

  private persistConfig(config: LocationSharingConfig & { clientId: string }): void {
    localStorage.setItem(this.storageKeys.enabled, 'true');
    localStorage.setItem(this.storageKeys.clientId, config.clientId);
    localStorage.setItem(this.storageKeys.uuid, config.uuid);
    localStorage.setItem(this.storageKeys.zona, config.zona);
    localStorage.setItem(this.storageKeys.userType, config.userType);
    localStorage.setItem(this.storageKeys.intervalMinutes, String(config.intervalMinutes));
    localStorage.setItem(this.storageKeys.displayName, config.displayName || '');
    localStorage.setItem(this.storageKeys.source, config.source || 'web');
  }

  private readConfigFromStorage(): (LocationSharingConfig & { clientId: string }) | null {
    const clientId = localStorage.getItem(this.storageKeys.clientId) || '';
    const uuid = localStorage.getItem(this.storageKeys.uuid) || '';
    const zona = localStorage.getItem(this.storageKeys.zona) || '';
    const userType = localStorage.getItem(this.storageKeys.userType) || '';
    const intervalMinutes = Number(localStorage.getItem(this.storageKeys.intervalMinutes) || '3');

    if (!clientId || !uuid || !zona || !userType) {
      return null;
    }

    return {
      clientId,
      uuid,
      zona,
      userType,
      intervalMinutes: Number.isFinite(intervalMinutes) && intervalMinutes > 0 ? intervalMinutes : 3,
      displayName: localStorage.getItem(this.storageKeys.displayName) || undefined,
      source: localStorage.getItem(this.storageKeys.source) || 'web',
    };
  }

  private clearStoredConfig(): void {
    localStorage.removeItem(this.storageKeys.enabled);
    localStorage.removeItem(this.storageKeys.clientId);
    localStorage.removeItem(this.storageKeys.uuid);
    localStorage.removeItem(this.storageKeys.zona);
    localStorage.removeItem(this.storageKeys.userType);
    localStorage.removeItem(this.storageKeys.intervalMinutes);
    localStorage.removeItem(this.storageKeys.displayName);
    localStorage.removeItem(this.storageKeys.source);
  }

  private patchState(patch: Partial<LocationSharingState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...patch,
    });
  }

  private clearTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private canRunInBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private isAllowedUserType(userType: string): boolean {
    return ['coor', 'boss', 'coor_manana'].includes((userType || '').toLowerCase()) || (userType === 'test' && localStorage.getItem('zona')?.toLowerCase() === 'coor');
  }

  private getOrCreateClientId(): string {
    const existing = localStorage.getItem(this.storageKeys.clientId);
    if (existing) return existing;

    const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    localStorage.setItem(this.storageKeys.clientId, generated);
    return generated;
  }

  private getGeolocationErrorMessage(error: GeolocationPositionError): string {
    if (!error) return 'No se pudo obtener la ubicación.';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Permiso de ubicación denegado.';
      case error.POSITION_UNAVAILABLE:
        return 'La ubicación no está disponible en este momento.';
      case error.TIMEOUT:
        return 'La lectura de ubicación ha superado el tiempo permitido.';
      default:
        return 'No se pudo obtener la ubicación.';
    }
  }

  private getHttpErrorMessage(error: any): string {
    return error?.error?.message || error?.message || 'No se pudo guardar la ubicación.';
  }

  /**
   * Force-send the current location immediately regardless of the configured interval.
   * Uses stored config (or current config) and does not alter timers or persisted config.
   */
  async forceShareNow(): Promise<void> {
    if (!this.canRunInBrowser()) return;

    const config = this.currentConfig ?? this.readConfigFromStorage();
    if (!config || !this.isAllowedUserType(config.userType)) {
      this.patchState({ lastError: 'Perfil no autorizado o configuración ausente.' });
      return;
    }

    if (!navigator.geolocation) {
      this.patchState({ lastError: 'Tu navegador no permite obtener la ubicación.' });
      return;
    }

    const position = await new Promise<GeolocationPosition | null>(resolve => {
      navigator.geolocation.getCurrentPosition(
        pos => resolve(pos),
        error => {
          this.patchState({ lastError: this.getGeolocationErrorMessage(error) });
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });

    if (!position) return;

    this.asociacionesService.upsertUbicacionCompartida({
      clientId: config.clientId || this.getOrCreateClientId(),
      uuid: config.uuid,
      displayName: config.displayName || config.userType || config.uuid,
      zona: config.zona,
      userType: config.userType,
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      source: config.source || 'web',
    }).subscribe({
      next: () => {
        const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.patchState({ lastSentAt: time, lastError: null, statusMessage: `Último envío: ${time}.` });
      },
      error: error => {
        this.patchState({ lastError: this.getHttpErrorMessage(error) });
      }
    });
  }
}