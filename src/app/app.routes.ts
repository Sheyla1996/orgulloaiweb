import { Routes } from '@angular/router';
import { ListCarrozasComponent } from './pages/list-carrozas/list-carrozas.component';
import { ListAsociacionesComponent } from './pages/list-asociaciones/list-asociaciones.component';
import { ListTelefonosComponent } from './pages/list-telefonos/list-telefonos.component';
import { AuthGuard } from './auth.guard';
import { LoginComponent } from './login/login.component';
import { AdminComponent } from './pages/admin/admin.component';

export const routes: Routes = [
    { path: '', redirectTo: '/asociaciones', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    {
        path: 'carrozas',
        component: ListCarrozasComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['mañana', 'boss'] }
    },
    {
        path: 'asociaciones',
        component: ListAsociacionesComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['normal', 'mañana', 'coor', 'boss'] }
    },
    {
        path: 'telefonos',
        component: ListTelefonosComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['normal', 'mañana', 'coor', 'boss'] }
    },
    {
        path: 'admin',
        component: AdminComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['boss'] }
    }
];
