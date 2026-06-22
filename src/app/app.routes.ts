import { Routes } from '@angular/router';
import { ListCarrozasComponent } from './pages/list-carrozas/list-carrozas.component';
import { ListAsociacionesComponent } from './pages/list-asociaciones/list-asociaciones.component';
import { ListTelefonosComponent } from './pages/list-telefonos/list-telefonos.component';
import { MapOnlyComponent } from './pages/map-only/map-only.component';
import { AuthGuard } from './auth.guard';
import { LoginComponent } from './login/login.component';
import { AdminComponent } from './pages/admin/admin.component';
import { AdminEditorComponent } from './pages/admin/admin-editor.component';
import { ChatComponent } from './pages/list-messages/list-messages.component';
import { HomeComponent } from './pages/home/home.component';
import { QrComponent } from './pages/qr/qr.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'qr', component: QrComponent },
    { path: 'login', component: LoginComponent },
    {
        path: 'asociaciones',
        component: ListAsociacionesComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['normal', 'coor_manana', 'coor', 'boss'] }
    },
    {
        path: 'mapa',
        component: MapOnlyComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['normal', 'coor_manana', 'coor', 'boss'] }
    },
    {
        path: 'carrozas',
        component: ListCarrozasComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['boss', 'coor_manana', 'rosa'] }
    },
    {
        path: 'telefonos',
        component: ListTelefonosComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['normal', 'coor_manana', 'coor', 'boss'] }
    },
    {
        path: 'messages',
        component: ChatComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['boss'] }
    },
    {
        path: 'admin',
        component: AdminComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['boss'] }
    },
    {
        path: 'admin/editor',
        component: AdminEditorComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['boss'] }
    }
    ,
    {
        path: 'ajustes',
        loadComponent: () => import('./pages/ajustes/ajustes.component').then(m => m.AjustesComponent),
        canActivate: [AuthGuard],
        data: { allowed: ['normal', 'coor_manana', 'coor', 'boss'] }
    }
];
