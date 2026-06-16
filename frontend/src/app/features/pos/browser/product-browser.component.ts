import {
  Component, input, output, signal, inject, effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MasterService } from '../../../core/services/master.service';
import { ProductService } from '../../../core/services/product.service';
import { ItemLayer1, ItemLayer2, TouchProduct } from '../../../core/models/master.models';
import { ProductMaster } from '../../../core/models/product.models';

@Component({
  selector: 'app-product-browser',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pb-root">

      <!-- ── Layer 1: horizontal tab strip ────────────────────────── -->
      <div class="pb-tabs">
        @for (l1 of layer1List(); track l1.itemLayer1ID) {
          <button class="pb-tab"
            [class.pb-tab--active]="selectedL1()?.itemLayer1ID === l1.itemLayer1ID"
            (click)="selectL1(l1)">
            {{ l1.itemLayer1Name }}
          </button>
        }
      </div>

      <!-- ── Body: layer2 sidebar + products grid ──────────────────── -->
      <div class="pb-body">

        <!-- Layer 2 vertical list -->
        <div class="pb-cats">
          @for (l2 of layer2List(); track l2.itemLayer2ID) {
            <button class="pb-cat"
              [class.pb-cat--active]="selectedL2()?.itemLayer2ID === l2.itemLayer2ID"
              (click)="selectL2(l2)">
              {{ l2.itemLayer2Name }}
            </button>
          }
          @if (layer2List().length === 0 && selectedL1()) {
            <div class="pb-empty-cats">–</div>
          }
        </div>

        <!-- Products grid -->
        <div class="pb-grid">
          @if (loadingProducts()) {
            <div class="pb-spinner"><i class="pi pi-spin pi-spinner"></i></div>
          }
          @for (p of products(); track p.productID) {
            <button class="pb-item"
              [class.pb-item--loading]="loadingId() === p.productID"
              (click)="selectProduct(p)">
              <span class="pb-item-name">{{ p.productName }}</span>
            </button>
          }
          @if (!loadingProducts() && products().length === 0 && selectedL1()) {
            <div class="pb-empty">No products</div>
          }
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .pb-root {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      background: #161c25;
      border-radius: 6px;
      overflow: hidden;
    }

    /* ── Layer 1 tabs ──────────────────────────────────────────────── */
    .pb-tabs {
      display: flex;
      flex-wrap: nowrap;
      overflow-x: auto;
      gap: 3px;
      padding: 5px 5px 0;
      background: #0f131a;
      flex-shrink: 0;
      scrollbar-width: none;
    }
    .pb-tabs::-webkit-scrollbar { display: none; }

    .pb-tab {
      flex-shrink: 0;
      padding: 0 14px;
      height: 44px;
      min-width: 80px;
      border: none;
      border-radius: 5px 5px 0 0;
      background: #252d3a;
      color: #94a3b8;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      cursor: pointer;
      transition: background 0.12s, color 0.12s;
      white-space: nowrap;
    }
    .pb-tab:hover  { background: #2d3a4e; color: #cbd5e1; }
    .pb-tab--active {
      background: #217a3c;
      color: #fff;
    }

    /* ── Body ──────────────────────────────────────────────────────── */
    .pb-body {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      gap: 0;
    }

    /* ── Layer 2 sidebar ───────────────────────────────────────────── */
    .pb-cats {
      width: 120px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
      padding: 4px;
      background: #1a2130;
      border-right: 1px solid #0f1420;
      scrollbar-width: thin;
      scrollbar-color: #2d3748 transparent;
    }

    .pb-cat {
      width: 100%;
      min-height: 52px;
      padding: 6px 8px;
      border: 1px solid #2d3748;
      border-radius: 4px;
      background: #252d3a;
      color: #94a3b8;
      font-size: 0.7rem;
      font-weight: 600;
      text-align: center;
      text-transform: uppercase;
      word-break: break-word;
      white-space: normal;
      line-height: 1.2;
      cursor: pointer;
      transition: background 0.12s;
    }
    .pb-cat:hover { background: #2d3a4e; color: #e2e8f0; }
    .pb-cat--active {
      background: #145a2d;
      color: #86efac;
      border-color: #1a7a3c;
    }

    .pb-empty-cats {
      color: #374151;
      text-align: center;
      padding: 12px 4px;
      font-size: 0.9rem;
    }

    /* ── Products grid ─────────────────────────────────────────────── */
    .pb-grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      grid-auto-rows: 72px;
      gap: 3px;
      padding: 4px;
      overflow-y: auto;
      align-content: start;
      position: relative;
      scrollbar-width: thin;
      scrollbar-color: #2d3748 transparent;
    }

    .pb-item {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px 6px;
      border: 1px solid #1a4a2a;
      border-radius: 5px;
      background: linear-gradient(160deg, #1e5e31 0%, #174d28 100%);
      color: #d1fae5;
      font-size: 0.72rem;
      font-weight: 600;
      text-align: center;
      text-transform: uppercase;
      word-break: break-word;
      white-space: normal;
      line-height: 1.25;
      cursor: pointer;
      transition: background 0.1s, transform 0.08s;
      -webkit-tap-highlight-color: transparent;
    }
    .pb-item:hover  {
      background: linear-gradient(160deg, #22713a 0%, #1a5c2f 100%);
    }
    .pb-item:active {
      transform: scale(0.96);
      background: linear-gradient(160deg, #155225 0%, #113d1e 100%);
    }
    .pb-item--loading {
      opacity: 0.5;
      pointer-events: none;
    }
    .pb-item-name { display: block; }

    .pb-empty {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #374151;
      font-size: 0.85rem;
      height: 80px;
    }

    .pb-spinner {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #4ade80;
      font-size: 1.6rem;
      z-index: 1;
    }
  `]
})
export class ProductBrowserComponent {
  readonly locationIDBilling = input.required<number>();
  readonly productSelected = output<ProductMaster>();

  private readonly masterSvc = inject(MasterService);
  private readonly productSvc = inject(ProductService);

  readonly layer1List  = signal<ItemLayer1[]>([]);
  readonly layer2List  = signal<ItemLayer2[]>([]);
  readonly products    = signal<TouchProduct[]>([]);
  readonly selectedL1  = signal<ItemLayer1 | null>(null);
  readonly selectedL2  = signal<ItemLayer2 | null>(null);
  readonly loadingProducts = signal(false);
  readonly loadingId   = signal<number | null>(null);

  constructor() {
    effect(() => {
      const id = this.locationIDBilling();
      if (id > 0) this.loadLayer1();
    });
  }

  private loadLayer1() {
    this.masterSvc.getItemLayer1().subscribe({
      next: list => {
        this.layer1List.set(list);
        this.layer2List.set([]);
        this.products.set([]);
        this.selectedL1.set(null);
        this.selectedL2.set(null);
      }
    });
  }

  selectL1(l1: ItemLayer1) {
    this.selectedL1.set(l1);
    this.selectedL2.set(null);
    this.loadLayer2(l1.itemLayer1ID);
    this.loadProducts(l1.itemLayer1ID, undefined);
  }

  selectL2(l2: ItemLayer2) {
    this.selectedL2.set(l2);
    this.loadProducts(this.selectedL1()!.itemLayer1ID, l2.itemLayer2ID);
  }

  private loadLayer2(layer1Id: number) {
    this.masterSvc.getItemLayer2(layer1Id).subscribe({
      next: list => this.layer2List.set(list)
    });
  }

  private loadProducts(layer1Id?: number, layer2Id?: number) {
    this.loadingProducts.set(true);
    this.products.set([]);
    this.productSvc.getTouchProducts(layer1Id, layer2Id).subscribe({
      next: list  => { this.products.set(list); this.loadingProducts.set(false); },
      error: ()   => this.loadingProducts.set(false)
    });
  }

  selectProduct(p: TouchProduct) {
    this.loadingId.set(p.productID);
    this.productSvc.getById(p.productID, this.locationIDBilling()).subscribe({
      next: full => { this.loadingId.set(null); this.productSelected.emit(full); },
      error: ()  => this.loadingId.set(null)
    });
  }
}
