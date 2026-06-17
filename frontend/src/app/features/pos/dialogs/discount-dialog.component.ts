import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectButtonModule } from 'primeng/selectbutton';
import { OrderLineDto } from '../../../core/models/transaction.models';

export interface DiscountResult {
  rowNo: number;
  productCode: string;
  discount: number;
  isPercentage: boolean;
  isSubTotal: boolean;
  discountID: number;
  netAmount: number;
  documentID: number;
}

@Component({
  selector: 'app-discount-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputNumberModule, SelectButtonModule],
  template: `
    <p-dialog [(visible)]="visible" [modal]="true" [closable]="true"
              (onHide)="onCancel()"
              [header]="line ? 'Item Discount' : 'Bill Discount'"
              [style]="{ width: '380px' }" [draggable]="false">

      <div class="discount-body">

        <!-- ── Item info (item-level mode) ─────────────────── -->
        @if (line) {
          <div class="disc-info-row item-mode">
            <span class="disc-label">ITEM</span>
            <div class="disc-info-detail">
              <span class="disc-name">{{ line.descrip }}</span>
              <span class="disc-amount">{{ line.nett | number:'1.2-2' }}</span>
            </div>
          </div>
        }

        <!-- ── Bill info (bill-level mode) ─────────────────── -->
        @if (!line) {
          <div class="disc-info-row bill-mode">
            <span class="disc-label">BILL</span>
            <div class="disc-info-detail">
              <span class="disc-name">Total Bill</span>
              <span class="disc-amount">{{ billTotal | number:'1.2-2' }}</span>
            </div>
          </div>
        }

        <!-- ── Mode toggle ─────────────────────────────────── -->
        <div class="disc-type-row">
          <p-selectButton [options]="typeOpts" [(ngModel)]="isPercentage"
                          optionLabel="label" optionValue="value"
                          styleClass="disc-type-btn" />
        </div>

        <!-- ── Value input ─────────────────────────────────── -->
        <div class="disc-input-row">
          <p-inputNumber [(ngModel)]="discountValue"
                         [min]="0" [max]="isPercentage ? 100 : 9999999"
                         [minFractionDigits]="2" [maxFractionDigits]="2"
                         [placeholder]="isPercentage ? 'Percentage %' : 'Amount'"
                         styleClass="disc-input" inputStyleClass="disc-input-field"
                         (keyup.enter)="apply()" />
        </div>

        <!-- ── Discount level ──────────────────────────────── -->
        <div class="disc-levels">
          <span class="level-label">Level:</span>
          <div class="level-buttons">
            @for (l of [1,2,3,4,5]; track l) {
              <button class="level-btn" [class.active]="discountID === l"
                      (click)="discountID = l">{{ l }}</button>
            }
          </div>
        </div>

      </div>

      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" (onClick)="onCancel()" />
        <p-button label="Apply" severity="success" icon="pi pi-check"
                  (onClick)="apply()" [disabled]="!discountValue" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .discount-body { padding: 0.5rem 0; }

    .disc-info-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
    }
    .item-mode { background: var(--surface-100); }
    .bill-mode { background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.2); }

    .disc-label {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 1px;
      padding: 0.2rem 0.45rem;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .item-mode .disc-label { background: var(--surface-300); color: var(--text-color-secondary); }
    .bill-mode .disc-label { background: rgba(99,102,241,0.2); color: #a5b4fc; }

    .disc-info-detail {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex: 1;
      gap: 0.5rem;
    }
    .disc-name { font-weight: 600; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .disc-amount { color: var(--primary-color); font-weight: 700; flex-shrink: 0; }

    .disc-type-row { margin-bottom: 1rem; }
    .disc-input-row { margin-bottom: 1rem; }

    .disc-levels { display: flex; align-items: center; gap: 0.75rem; }
    .level-label { font-size: 0.85rem; color: var(--text-color-secondary); }
    .level-buttons { display: flex; gap: 0.4rem; }
    .level-btn {
      width: 2rem; height: 2rem;
      border: 1px solid var(--surface-border);
      border-radius: 4px;
      background: var(--surface-card);
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.15s;
    }
    .level-btn.active { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }

    :host ::ng-deep .disc-input { width: 100%; }
    :host ::ng-deep .disc-input-field { width: 100%; font-size: 1.1rem; text-align: right; }
    :host ::ng-deep .disc-type-btn .p-button { flex: 1; }
  `]
})
export class DiscountDialogComponent implements OnChanges {
  @Input() visible = false;
  /** Selected order line. Null when applying a bill-level (subtotal) discount. */
  @Input() line: OrderLineDto | null = null;
  /** Bill total — shown when no line is selected (bill-level mode). */
  @Input() billTotal = 0;
  @Input() initialLevel = 1;
  /** Controls which tab opens when the dialog is shown. */
  @Input() defaultIsPercentage = true;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() applied = new EventEmitter<DiscountResult>();

  isPercentage = true;
  discountValue: number | null = null;
  discountID = 1;

  typeOpts = [
    { label: 'Percentage %', value: true },
    { label: 'Amount', value: false }
  ];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue === true) {
      this.discountID = this.initialLevel > 0 ? this.initialLevel : 1;
      this.isPercentage = this.defaultIsPercentage;
      this.discountValue = null;
    }
  }

  onCancel() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.discountValue = null;
  }

  apply() {
    if (!this.discountValue) return;

    const isItemLevel = !!this.line;

    this.applied.emit({
      rowNo:        isItemLevel ? this.line!.rowNo : 0,
      productCode:  isItemLevel ? this.line!.productCode : '',
      discount:     this.discountValue,
      isPercentage: this.isPercentage,
      isSubTotal:   !isItemLevel,          // bill-level → isSubTotal = true
      discountID:   this.discountID,
      netAmount:    isItemLevel ? this.line!.nett : this.billTotal,
      documentID:   isItemLevel ? this.line!.documentID : 6   // DocumentID 6 = subtotal discount
    });
    this.onCancel();
  }
}
