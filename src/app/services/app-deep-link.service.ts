import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppDeepLinkService {
  readonly playStoreUrl = 'https://play.google.com/store/apps/details?id=cl.padelacademy.app&pcampaignid=web_share';
  readonly appStoreUrl = 'https://apps.apple.com/cl/app/padelblox-chile/id6759664729';
  readonly androidPackage = 'cl.padelacademy.app';
  readonly appScheme = 'padelblox';

  isMobile(): boolean {
    if (typeof window === 'undefined' || !navigator) return false;
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
  }

  isIOS(): boolean {
    if (typeof window === 'undefined' || !navigator) return false;
    return /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  }

  isAndroid(): boolean {
    if (typeof window === 'undefined' || !navigator) return false;
    return /Android/i.test(navigator.userAgent || '');
  }

  getStoreUrl(): string {
    return this.isIOS() ? this.appStoreUrl : this.playStoreUrl;
  }

  getStoreName(): string {
    return this.isIOS() ? 'App Store (iPhone)' : 'Google Play (Android)';
  }

  openAppOrStore(pathWithQuery: string, onProgress?: (status: 'opening' | 'redirecting_store') => void): void {
    const cleanPath = pathWithQuery.replace(/^\/+/, '');
    const storeUrl = this.getStoreUrl();

    if (onProgress) {
      onProgress('opening');
    }

    if (this.isAndroid()) {
      const intentUrl = `intent://${cleanPath}#Intent;scheme=${this.appScheme};package=${this.androidPackage};S.browser_fallback_url=${encodeURIComponent(storeUrl)};end`;
      
      const timer = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          if (onProgress) onProgress('redirecting_store');
          window.location.href = storeUrl;
        }
      }, 2000);

      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          clearTimeout(timer);
        }
      }, { once: true });

      window.location.href = intentUrl;
      return;
    }

    if (this.isIOS()) {
      const customUrl = `${this.appScheme}://${cleanPath}`;
      const startTime = Date.now();

      const timer = setTimeout(() => {
        if (document.visibilityState === 'visible' && Date.now() - startTime < 3000) {
          if (onProgress) onProgress('redirecting_store');
          window.location.href = this.appStoreUrl;
        }
      }, 1800);

      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          clearTimeout(timer);
        }
      }, { once: true });

      window.location.href = customUrl;
      return;
    }

    if (onProgress) onProgress('redirecting_store');
    window.location.href = storeUrl;
  }
}
