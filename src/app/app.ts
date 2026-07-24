import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from './services/language.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Pausalio');
  private langService = inject(LanguageService);
  private themeService = inject(ThemeService);

  constructor() {
    this.langService.init();
    this.themeService.init();
  }
}