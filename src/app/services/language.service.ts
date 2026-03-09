import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'sr-Latn' | 'sr-Cyrl';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly STORAGE_KEY = 'lang';
  private readonly DEFAULT: AppLanguage = 'sr-Latn';

  private translate = inject(TranslateService);

  currentLang = signal<AppLanguage>(this.getSavedLang());

  init(): void {
    this.translate.addLangs(['sr-Latn', 'sr-Cyrl']);
    this.translate.setDefaultLang(this.DEFAULT);
    this.translate.use(this.currentLang());
  }

  switchLang(lang: AppLanguage): void {
    this.translate.use(lang);
    this.currentLang.set(lang);
    localStorage.setItem(this.STORAGE_KEY, lang);
  }

  private getSavedLang(): AppLanguage {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    return (saved === 'sr-Latn' || saved === 'sr-Cyrl') ? saved : this.DEFAULT;
  }
}