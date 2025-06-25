import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { WebSocketService } from './websocket.service';
import { SessionService } from './session.service';
import { Roles } from '../roles';

@Injectable({ providedIn: 'root' })
export class WebSocketEventsService {
  constructor(
    private toastr: ToastrService,
    private session: SessionService,
    private _wsService: WebSocketService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  init(): void {
    this._wsService.connect();
    this._wsService.messages$.subscribe((msg) => {
      if (msg && isPlatformBrowser(this.platformId)) {
        const userType = this.session.userType || '';
        if (msg.type === 'message') {
          this.toastr.success(msg.message, 'Nuevo mensaje:', {
            closeButton: true,
            timeOut: 20000
          });
        } else if (msg.type === 'actualizar_listado_carr' && [Roles.Manana, Roles.Boss].includes(userType)) {
          const { carroza } = msg;
          const baseOptions = {
            closeButton: true,
            timeOut: 20000,
            disableTimeOut: true
          };
          if (carroza.status === 'pendiente') {
            this.toastr.error(`La carroza ${carroza.position} - ${carroza.name} está pendiente de llegar`, '', baseOptions);
          } else if (carroza.status === 'situado') {
            this.toastr.warning(`La carroza ${carroza.position} - ${carroza.name} está ya aparcada`, '', baseOptions);
          } else if (carroza.status === 'aparcando') {
            this.toastr.info(`La carroza ${carroza.position} - ${carroza.name} está aparcando`, '', baseOptions);
          }
        }
      }
    });
  }
}