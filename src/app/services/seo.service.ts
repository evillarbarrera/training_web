import { Injectable, Inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

export interface SeoConfig {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  schema?: any;
  schemaJson?: any;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly defaultBaseUrl = 'https://padelblox.cl';
  private readonly defaultOgImage = 'https://padelblox.cl/assets/images/og-image.png';

  constructor(
    private titleService: Title,
    private metaService: Meta,
    @Inject(DOCUMENT) private doc: Document
  ) {}

  /**
   * Set complete SEO metadata for a page
   */
  setPageSeo(config: SeoConfig): void {
    // 1. Title
    this.titleService.setTitle(config.title);

    // 2. Standard Meta Tags
    this.metaService.updateTag({ name: 'description', content: config.description });
    if (config.keywords) {
      this.metaService.updateTag({ name: 'keywords', content: config.keywords });
    }
    this.metaService.updateTag({ name: 'author', content: 'PadelBlox Software' });
    this.metaService.updateTag({ name: 'robots', content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' });

    // 3. Open Graph Tags
    const url = config.canonicalUrl || (this.defaultBaseUrl + (this.doc.location ? this.doc.location.pathname : ''));
    const ogTitle = config.ogTitle || config.title;
    const ogDesc = config.ogDescription || config.description;
    const ogImage = config.ogImage || this.defaultOgImage;
    const ogType = config.ogType || 'website';

    this.metaService.updateTag({ property: 'og:title', content: ogTitle });
    this.metaService.updateTag({ property: 'og:description', content: ogDesc });
    this.metaService.updateTag({ property: 'og:url', content: url });
    this.metaService.updateTag({ property: 'og:type', content: ogType });
    this.metaService.updateTag({ property: 'og:site_name', content: 'PadelBlox' });
    this.metaService.updateTag({ property: 'og:locale', content: 'es_CL' });
    this.metaService.updateTag({ property: 'og:image', content: ogImage });

    // 4. Twitter Cards
    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: ogTitle });
    this.metaService.updateTag({ name: 'twitter:description', content: ogDesc });
    this.metaService.updateTag({ name: 'twitter:image', content: ogImage });

    // 5. Canonical Link
    this.updateCanonicalUrl(url);

    // 6. JSON-LD Schema
    const schemaData = config.schemaJson || config.schema;
    if (schemaData) {
      this.setJsonLdSchema(schemaData);
    }
  }

  /**
   * Update or create canonical link in document head
   */
  private updateCanonicalUrl(url: string): void {
    try {
      let link: HTMLLinkElement | null = this.doc.querySelector('link[rel="canonical"]');
      if (!link) {
        link = this.doc.createElement('link');
        link.setAttribute('rel', 'canonical');
        this.doc.head.appendChild(link);
      }
      link.setAttribute('href', url);
    } catch (e) {
      // safe fallback
    }
  }

  /**
   * Inject dynamic JSON-LD structured data into head
   */
  private setJsonLdSchema(schemaData: any): void {
    try {
      const existingScript = this.doc.getElementById('dynamic-json-ld');
      if (existingScript) {
        existingScript.remove();
      }

      const script = this.doc.createElement('script');
      script.id = 'dynamic-json-ld';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schemaData);
      this.doc.head.appendChild(script);
    } catch (e) {
      // safe fallback
    }
  }
}
