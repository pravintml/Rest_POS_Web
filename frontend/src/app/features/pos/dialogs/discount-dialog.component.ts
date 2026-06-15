import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
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
              (onHide)="onCancel()" header="Apply Discount"
              [style]="{ width: '380px' }" [draggable]="false">

      <div class="discount-body">
        <div class="item-info" *ngIf="line">
          <span class="item-name">{{ line.descrip }}</span>
          <span class="item-nett">Net: {{ line.nett | number:'1.2-2' }}</span>
        </div>

        <div class="disc-type-row">
          <p-selectButton [options]="typeOpts" [(ngModel)]="isPercentage" optionLabel="label" optionValue="value"
                          styleClass="disc-type-btn" />
        </div>

        <div class="disc-input-row">
          <p-inputNumber [(ngModel)]="discountValue"
                         [min]="0" [max]="isPercentage ? 100 : 999999"
                         [minFractionDigits]="2" [maxFractionDigits]="2"
                         [placeholder]="isPercentage ? 'Percentage %' : 'Amount'"
                         styleClass="disc-input" inputStyleClass="disc-input-field"
                         (keyup.enter)="apply()" />
        </div>

        <div class="disc-levels">
          <span class="level-label">Level:</span>
          <div class="level-buttons">
            @for (l of [1,2,3,4,5]; track l) {
              <button class="level-btn" [class.active]="discountID === l" (click)="discountID = l">{{ l }}</button>
            }
          </div>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" (onClick)="onCancel()" />
        <p-button label="Apply" severity="success" icon="pi pi-check" (onClick)="apply()" [disabled]="!discountValue" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .discount-body { padding: 0.5rem 0; }
    .item-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 0.5rem; background: var(--surface-100); border-radius: 6px; }
    .item-name { font-weight: 600; font-size: 0.95rem; }
    .item-nett { color: var(--primary-color); font-weight: 700; }
    .disc-type-row { margin-bottom: 1rem; }
    .disc-input-row { margin-bottom: 1rem; }
    .disc-levels { display: flex; align-items: center; gap: 0.75rem; }
    .level-label { font-size: 0.85rem; color: var(--text-color-secondary); }
    .level-buttons { display: flex; gap: 0.4rem; }
    .level-btn { width: 2rem; height: 2rem; border: 1px solid var(--surface-border); border-radius: 4px; background: var(--surface-card); cursor: pointer; font-size: 0.85rem; transition: all 0.15s; }
    .level-btn.active { background: var(--primary-color); color: #fff; border-color: var(--primary-color); }
    :host ::ng-deep .disc-input { width: 100%; }
    :host ::ng-deep .disc-input-field { width: 100%; font-size: 1.1rem; text-align: right; }
    :host ::ng-deep .disc-type-btn .p-button { flex: 1; }
  `]
})
export class DiscountDialogComponent {
  @Input() visible = false;
  @Input() line: OrderLineDto | null = null;
  @Input() isSubTotal = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() applied = new EventEmitter<DiscountResult>();

  isPercentage = true;
  discountValue: number | null = null;
  discountID = 1;

  typeOpts = [
    { label: 'Percentage %', value: true },
    { label: 'Amount', value: false }
  ];

  onCancel() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.reset();
  }

  apply() {
    if (!this.discountValue || !this.line) return;
    this.applied.emit({
      rowNo: this.line.rowNo,
      productCode: this.line.productCode,
      discount: this.discountValue,
      isPercentage: this.isPercentage,
      isSubTotal: this.isSubTotal,
      discountID: this.discountID,
      netAmount: this.line.nett,
      documentID: this.line.documentID
    });
    this.onCancel();
  }

  private reset() {
    this.discountValue = null;
    this.isPercentage = true;
    this.discountID = 1;
  }
}
