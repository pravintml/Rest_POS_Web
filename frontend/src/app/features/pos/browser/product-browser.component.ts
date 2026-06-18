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
      background: #14141f;
      border-radius: 8px;
      overflow: hidden;
    }

    /* ── Layer 1 tabs (main layer — indigo) ────────────────────────── */
    .pb-tabs {
      display: flex;
      flex-wrap: nowrap;
      overflow-x: auto;
      gap: 5px;
      padding: 8px;
      background: #0f0f18;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      flex-shrink: 0;
      scrollbar-width: none;
    }
    .pb-tabs::-webkit-scrollbar { display: none; }

    .pb-tab {
      flex-shrink: 0;
      position: relative;
      overflow: hidden;
      padding: 0 16px;
      height: 44px;
      min-width: 80px;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px;
      background: #1f1f30;
      color: #9a9ab5;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.08s;
    }
    .pb-tab:hover {
      background: #29293f;
      color: #d7d7e6;
      border-color: rgba(129,140,248,0.25);
    }
    .pb-tab:active { transform: scale(0.96); }
    .pb-tab--active {
      background: rgba(129,140,248,0.14);
      color: #e0e7ff;
      border-color: #818cf8;
      box-shadow: inset 0 -3px 0 #818cf8;
    }
    .pb-tab--active:hover {
      background: rgba(129,140,248,0.22);
      color: #fff;
      border-color: #a5b4fc;
    }

    /* ── Body ──────────────────────────────────────────────────────── */
    .pb-body {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      gap: 0;
    }

    /* ── Layer 2 sidebar (sub layer) ───────────────────────────────── */
    .pb-cats {
      width: 122px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 5px;
      overflow-y: auto;
      padding: 8px 6px;
      background: #12121c;
      border-right: 1px solid rgba(255,255,255,0.05);
      scrollbar-width: thin;
      scrollbar-color: #2d2d45 transparent;
    }
    .pb-cats::-webkit-scrollbar { width: 5px; }
    .pb-cats::-webkit-scrollbar-thumb { background: #2d2d45; border-radius: 3px; }

    .pb-cat {
      width: 100%;
      min-height: 54px;
      padding: 8px;
      border: 1px solid rgba(45,198,83,0.22);
      border-radius: 8px;
      background: rgba(45,198,83,0.10);
      color: #86efac;
      font-size: 0.7rem;
      font-weight: 600;
      text-align: center;
      text-transform: uppercase;
      word-break: break-word;
      white-space: normal;
      line-height: 1.25;
      cursor: pointer;
      box-shadow: inset 3px 0 0 rgba(45,198,83,0.3);
      transition: background 0.15s, border-color 0.15s, transform 0.08s;
    }
    .pb-cat:hover { background: rgba(45,198,83,0.16); }
    .pb-cat:active { transform: scale(0.97); }
    .pb-cat--active {
      background: rgba(45,198,83,0.14);
      color: #d1fae5;
      border-color: #2dc653;
      box-shadow: inset 3px 0 0 #2dc653;
    }

    .pb-empty-cats {
      color: #3a3a4a;
      text-align: center;
      padding: 14px 4px;
      font-size: 0.9rem;
    }

    /* ── Products grid (item buttons) ──────────────────────────────── */
    .pb-grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
      grid-auto-rows: 74px;
      gap: 6px;
      padding: 8px;
      overflow-y: auto;
      align-content: start;
      position: relative;
      scrollbar-width: thin;
      scrollbar-color: #2d2d45 transparent;
    }
    .pb-grid::-webkit-scrollbar { width: 6px; }
    .pb-grid::-webkit-scrollbar-thumb { background: #2d2d45; border-radius: 3px; }

    .pb-item {
      width: 100%;
      min-height: 54px;
      padding: 8px;
      border: 1px solid rgba(34,211,238,0.3);
      border-radius: 8px;
      background: linear-gradient(160deg, rgba(34,211,238,0.18) 0%, rgba(34,211,238,0.08) 100%);
      color: #a5f3fc;
      font-size: 0.74rem;
      font-weight: 600;
      text-align: center;
      text-transform: uppercase;
      word-break: break-word;
      white-space: normal;
      line-height: 1.25;
      cursor: pointer;
      box-shadow: inset 3px 0 0 #22d3ee;
      transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.08s;
      -webkit-tap-highlight-color: transparent;
    }
    .pb-item:hover {
      background: linear-gradient(160deg, rgba(34,211,238,0.28) 0%, rgba(34,211,238,0.14) 100%);
      color: #cffafe;
      border-color: rgba(34,211,238,0.55);
    }
    .pb-item:active { transform: scale(0.97); }
    .pb-item--loading {
      opacity: 0.45;
      pointer-events: none;
    }
    .pb-item-name { display: block; }

    .pb-empty {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #3a3a4a;
      font-size: 0.85rem;
      height: 80px;
    }

    .pb-spinner {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #22d3ee;
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
