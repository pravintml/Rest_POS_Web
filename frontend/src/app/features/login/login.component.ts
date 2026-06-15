import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/services/auth.service';
import { TerminalConfig } from '../../core/models/auth.models';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, InputNumberModule,
    ProgressSpinnerModule, ToastModule
  ],
  providers: [MessageService],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  readonly showSetup = signal(false);
  readonly pin = signal('');
  readonly loading = signal(false);
  readonly error = signal('');

  setupLocationId = 1;
  setupUnitNo = 1;
  terminalConfig = signal<TerminalConfig | null>(null);

  readonly pinMask = computed(() => {
    const len = this.pin().length;
    return Array.from({ length: Math.max(len, 6) }, (_, i) => i < len);
  });

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/pos']);
      return;
    }
    const cfg = this.auth.getTerminalConfig();
    if (cfg) {
      this.terminalConfig.set(cfg);
    } else {
      this.showSetup.set(true);
    }
  }

  saveTerminal(): void {
    if (!this.setupLocationId || !this.setupUnitNo) return;
    const cfg: TerminalConfig = { locationId: this.setupLocationId, unitNo: this.setupUnitNo };
    this.auth.saveTerminalConfig(cfg);
    this.terminalConfig.set(cfg);
    this.showSetup.set(false);
  }

  numpadPress(digit: string): void {
    this.error.set('');
    const current = this.pin();
    const maxLen = 20;
    if (current.length < maxLen) this.pin.set(current + digit);
  }

  backspace(): void {
    this.error.set('');
    const p = this.pin();
    if (p.length > 0) this.pin.set(p.slice(0, -1));
  }

  clearPin(): void {
    this.pin.set('');
    this.error.set('');
  }

  signIn(): void {
    const cfg = this.terminalConfig();
    if (!cfg) { this.showSetup.set(true); return; }
    const p = this.pin();
    if (!p) { this.error.set('Please enter your password'); return; }

    this.loading.set(true);
    this.error.set('');
    this.auth.signIn({ password: p, locationId: cfg.locationId, unitNo: cfg.unitNo, useEncode: false })
      .subscribe({
        next: () => { this.router.navigate(['/pos']); },
        error: err => {
          this.loading.set(false);
          this.pin.set('');
          const msg = err.status === 401 ? 'Invalid password' : 'Connection error. Check API is running.';
          this.error.set(msg);
        }
      });
  }

  changeTerminal(): void {
    const cfg = this.auth.getTerminalConfig();
    if (cfg) {
      this.setupLocationId = cfg.locationId;
      this.setupUnitNo = cfg.unitNo;
    }
    this.showSetup.set(true);
  }
}
