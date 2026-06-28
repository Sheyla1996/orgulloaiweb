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
    { path: '', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
    { path: 'qr', loadComponent: () => import('./pages/qr/qr.component').then(m => m.QrComponent) },
    { path: 'init', loadComponent: () => import('./pages/init/init.component').then(m => m.InitComponent) },
    { path: 'login', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent) },
    {
        path: 'asociaciones',
        loadComponent: () => import('./pages/list-asociaciones/list-asociaciones.component').then(m => m.ListAsociacionesComponent),
        canActivate: [AuthGuard],
        data: { allowed: ['normal', 'coor_manana', 'coor', 'boss', 'test'] }
    },
    {
        path: 'mapa',
        loadComponent: () =>
            import('./pages/map-only/map-only.component').then(m => m.MapOnlyComponent),
        canActivate: [AuthGuard],
        data: { allowed: ['normal', 'coor_manana', 'coor', 'boss', 'test'] }
    },
    {
        path: 'carrozas',
        loadComponent: () => import('./pages/list-carrozas/list-carrozas.component').then(m => m.ListCarrozasComponent),
        canActivate: [AuthGuard],
        data: { allowed: ['boss', 'coor_manana', 'rosa', 'test'] }
    },
    {
        path: 'telefonos',
        loadComponent: () => import('./pages/list-telefonos/list-telefonos.component').then(m => m.ListTelefonosComponent),
        canActivate: [AuthGuard],
        data: { allowed: ['normal', 'coor_manana', 'coor', 'boss', 'test'] }
    },
    {
        path: 'messages',
        loadComponent: () => import('./pages/list-messages/list-messages.component').then(m => m.ChatComponent),
        canActivate: [AuthGuard],
        data: { allowed: ['boss'] }
    },
    {
        path: 'admin',
        loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent),
        canActivate: [AuthGuard],
        data: { allowed: ['boss'] }
    },
    {
        path: 'admin/editor',
        loadComponent: () => import('./pages/admin/admin-editor.component').then(m => m.AdminEditorComponent),
        canActivate: [AuthGuard],
        data: { allowed: ['boss'] }
    }
    ,
    {
        path: 'ajustes',
        loadComponent: () => import('./pages/ajustes/ajustes.component').then(m => m.AjustesComponent),
        canActivate: [AuthGuard],
        data: { allowed: ['normal', 'coor_manana', 'coor', 'boss', 'test'] }
    }
];
