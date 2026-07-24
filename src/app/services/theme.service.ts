import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'theme';
  private themeSignal = signal<'light' | 'dark'>('light');

  isDark = signal<boolean>(false);

  constructor() {}

  init() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedTheme = localStorage.getItem(this.THEME_KEY) as 'light' | 'dark' | null;
      if (savedTheme) {
        this.setTheme(savedTheme);
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.setTheme(prefersDark ? 'dark' : 'light');
      }
    }
  }

  setTheme(theme: 'light' | 'dark') {
    this.themeSignal.set(theme);
    this.isDark.set(theme === 'dark');
    if (typeof window !== 'undefined') {
      if (theme === 'dark') {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
      localStorage.setItem(this.THEME_KEY, theme);
    }
  }

  toggle() {
    const nextTheme = this.themeSignal() === 'light' ? 'dark' : 'light';
    this.setTheme(nextTheme);
  }

  get currentTheme() {
    return this.themeSignal;
  }
}
