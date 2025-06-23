// auth.guard.ts
import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (isPlatformBrowser(this.platformId)) {
      const userType = localStorage.getItem('userType');
      const allowed = route.data['allowed'] as string[] | undefined;

      if (!allowed || allowed.includes(userType || '')) {
        return true;
      }

      if (userType) {
        return this.router.parseUrl('');
      }

      // 🚫 Evita redirigir a login si ya estás en login
      if (state.url === '/login') {
        return true;
      }

      return this.router.parseUrl('/login');
    }
    return false;
  }

}