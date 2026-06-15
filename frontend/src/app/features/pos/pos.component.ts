import { Component, signal, computed, inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/services/auth.service';
import { ConfigService } from '../../core/services/config.service';
import { ProductService } from '../../core/services/product.service';
import { OrderItem, ProductMaster } from '../../core/models/product.models';
import { SysConfig } from '../../core/models/config.models';

@Component({
  selector: 'app-pos',
  imports: [
    CommonModule, FormsModule,
    ButtonModule, InputTextModule, ProgressSpinnerModule,
    ToastModule, TagModule, DividerModule, BadgeModule, TooltipModule
  ],
  providers: [MessageService],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.scss'
})
export class PosComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly configSvc = inject(ConfigService);
  private readonly productSvc = inject(ProductService);
  private readonly messageService = inject(MessageService);

  @ViewChild('codeInput') codeInput!: ElementRef<HTMLInputElement>;

  readonly session = this.auth.session;
  readonly config = this.configSvc.config;
  readonly configLoading = signal(true);
  readonly configError = signal('');

  readonly orderItems = signal<OrderItem[]>([]);
  readonly numpadBuffer = signal('');
  readonly productSearching = signal(false);
  readonly currentTime = signal(new Date());

  readonly subtotal = computed(() =>
    this.orderItems().reduce((s, i) => s + i.lineTotal, 0)
  );
  readonly totalTax = computed(() =>
    this.orderItems().reduce((s, i) => s + i.tax, 0)
  );
  readonly grandTotal = computed(() => this.subtotal());

  readonly decimalPlaces = computed(() => this.config()?.decimalPointsCurrency ?? 2);
  readonly locationName = computed(() => this.config()?.locationName ?? 'Loading...');
  readonly itemCount = computed(() => this.orderItems().reduce((s, i) => s + i.qty, 0));

  private timeInterval?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.timeInterval = setInterval(() => this.currentTime.set(new Date()), 1000);

    this.configSvc.loadSession().subscribe({
      next: () => this.configLoading.set(false),
      error: err => {
        this.configLoading.set(false);
        this.configError.set('Failed to load terminal config');
        this.messageService.add({ severity: 'error', summary: 'Config Error', detail: 'Could not load terminal configuration' });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timeInterval) clearInterval(this.timeInterval);
  }

  numpadPress(key: string): void {
    if (key === '.') {
      if (!this.numpadBuffer().includes('.')) this.numpadBuffer.update(b => b + '.');
      return;
    }
    this.numpadBuffer.update(b => b + key);
  }

  numpadBackspace(): void {
    this.numpadBuffer.update(b => b.slice(0, -1));
  }

  numpadClear(): void {
    this.numpadBuffer.set('');
  }

  lookupByCode(code: string): void {
    if (!code.trim()) return;
    this.numpadBuffer.set('');
    this.productSearching.set(true);

    this.productSvc.getByCode(code.trim()).subscribe({
      next: product => {
        this.productSearching.set(false);
        this.addProduct(product);
      },
      error: err => {
        this.productSearching.set(false);
        const msg = err.status === 404 ? `Product not found: ${code}` : 'Product lookup failed';
        this.messageService.add({ severity: 'warn', summary: 'Not Found', detail: msg });
      }
    });
  }

  onCodeEnter(code: string): void {
    this.lookupByCode(code);
    if (this.codeInput) this.codeInput.nativeElement.value = '';
  }

  private addProduct(p: ProductMaster): void {
    const qty = this.numpadBuffer() ? parseFloat(this.numpadBuffer()) : 1;
    const existing = this.orderItems().findIndex(i => i.productID === p.productID);

    if (existing >= 0) {
      this.orderItems.update(items =>
        items.map((item, idx) => idx !== existing ? item : {
          ...item,
          qty: item.qty + qty,
          lineTotal: (item.qty + qty) * item.price - item.discount
        })
      );
    } else {
      const lineTotal = qty * p.sellingPrice;
      const newItem: OrderItem = {
        productID: p.productID,
        productCode: p.productCode,
        productName: p.nameOnInvoice || p.productName,
        qty,
        price: p.sellingPrice,
        discount: 0,
        discountPct: 0,
        tax: 0,
        lineTotal,
        isTax: p.isTax,
        orderTerminalID: p.orderTerminalID
      };
      this.orderItems.update(items => [...items, newItem]);
    }
    this.messageService.add({ severity: 'success', summary: 'Added', detail: `${p.productName} × ${qty}`, life: 1500 });
    setTimeout(() => this.codeInput?.nativeElement?.focus(), 50);
  }

  removeItem(index: number): void {
    this.orderItems.update(items => items.filter((_, i) => i !== index));
  }

  clearOrder(): void {
    this.orderItems.set([]);
    this.numpadBuffer.set('');
  }

  voidOrder(): void {
    if (this.orderItems().length === 0) return;
    this.clearOrder();
    this.messageService.add({ severity: 'info', summary: 'Voided', detail: 'Order cleared' });
  }

  signOut(): void {
    this.auth.signOut();
  }

  formatCurrency(value: number): string {
    return value.toFixed(this.decimalPlaces());
  }
}
