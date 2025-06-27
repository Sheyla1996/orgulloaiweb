import { Routes } from '@angular/router';
import { ListCarrozasComponent } from './pages/list-carrozas/list-carrozas.component';
import { ListAsociacionesComponent } from './pages/list-asociaciones/list-asociaciones.component';
import { ListTelefonosComponent } from './pages/list-telefonos/list-telefonos.component';
import { AuthGuard } from './auth.guard';
import { LoginComponent } from './login/login.component';
import { AdminComponent } from './pages/admin/admin.component';
import { ChatComponent } from './pages/list-messages/list-messages.component';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    {
        path: 'asociaciones',
        component: ListAsociacionesComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['normal', 'mañana', 'coor', 'boss', 'tarde', 'willy'] }
    },
    { path: 'login', component: LoginComponent },
    {
        path: 'carrozas',
        component: ListCarrozasComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['mañana', 'boss', 'willy'] }
    },
    {
        path: 'telefonos',
        component: ListTelefonosComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['normal', 'mañana', 'coor', 'boss', 'tarde', 'willy'] }
    },
    {
        path: 'messages',
        component: ChatComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['normal', 'mañana', 'coor', 'boss', 'tarde', 'willy'] }
    },
    {
        path: 'admin',
        component: AdminComponent,
        canActivate: [AuthGuard],
        data: { allowed: ['boss'] }
    }
];
