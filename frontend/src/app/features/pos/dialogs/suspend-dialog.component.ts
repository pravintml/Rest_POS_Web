import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { SuspendListItem, RecallRequest } from '../../../core/models/payment.models';

export type SuspendDialogMode = 'suspend' | 'recall';

@Component({
  selector: 'app-suspend-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, TableModule],
  template: `
    <p-dialog [(visible)]="visible" [modal]="true" [closable]="true"
              (onHide)="onCancel()"
              [header]="mode === 'suspend' ? 'Suspend Invoice' : 'Recall Invoice'"
              [style]="{ width: '480px', maxWidth: '98vw' }" [draggable]="false">

      <!-- SUSPEND MODE -->
      <div *ngIf="mode === 'suspend'" class="suspend-body">
        <p class="suspend-hint">Current bill will be saved and cleared so you can serve another customer.</p>
        <div class="suspend-total">
          <span>Bill Total:</span>
          <strong>{{ billTotal | number:'1.2-2' }}</strong>
        </div>
      </div>

      <!-- RECALL MODE -->
      <div *ngIf="mode === 'recall'" class="recall-body">
        <div class="recall-manual-row">
          <label>Suspend No.</label>
          <input pInputText [(ngModel)]="manualSuspendNo" placeholder="Enter suspend number" class="recall-input" (keyup.enter)="recallManual()" />
          <p-button label="Recall" icon="pi pi-undo" size="small" (onClick)="recallManual()" [disabled]="!manualSuspendNo.trim()" />
        </div>

        <p-table [value]="list()" [scrollable]="true" scrollHeight="220px" selectionMode="single"
                 [(selection)]="selectedItem" dataKey="suspendNo" styleClass="suspend-table"
                 [rowHover]="true" (onRowSelect)="onRowSelect($event)" emptyMessage="No suspended invoices">
          <ng-template pTemplate="header">
            <tr>
              <th>Suspend No</th>
              <th>Unit</th>
              <th class="text-right">Amount</th>
              <th>Time</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr [pSelectableRow]="row">
              <td>{{ row.suspendNo }}</td>
              <td>{{ row.unitNo }}</td>
              <td class="text-right">{{ row.amount | number:'1.2-2' }}</td>
              <td>{{ row.suspendTime }}</td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Cancel" severity="secondary" (onClick)="onCancel()" />
        <p-button *ngIf="mode === 'suspend'" label="Suspend" severity="contrast" icon="pi pi-pause"
                  (onClick)="confirmSuspend()" />
        <p-button *ngIf="mode === 'recall' && selectedItem" label="Recall Selected" severity="success"
                  icon="pi pi-undo" (onClick)="recallSelected()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .suspend-body { padding: 0.5rem 0; }
    .suspend-hint { color: var(--text-color-secondary); margin-bottom: 1rem; }
    .suspend-total { display: flex; justify-content: space-between; font-size: 1.1rem; padding: 0.5rem; background: var(--surface-100); border-radius: 6px; }
    .recall-body { padding: 0.25rem 0; }
    .recall-manual-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
    .recall-manual-row label { white-space: nowrap; font-size: 0.85rem; color: var(--text-color-secondary); }
    .recall-input { flex: 1; }
    :host ::ng-deep .suspend-table { font-size: 0.875rem; }
    .text-right { text-align: right; }
  `]
})
export class SuspendDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() mode: SuspendDialogMode = 'suspend';
  @Input() billTotal = 0;
  @Input() suspendList: SuspendListItem[] = [];
  @Input() recallUnitNo = 0;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() suspendConfirmed = new EventEmitter<void>();
  @Output() recallSelected$ = new EventEmitter<string>();

  readonly list = signal<SuspendListItem[]>([]);
  selectedItem: SuspendListItem | null = null;
  manualSuspendNo = '';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['suspendList']) this.list.set(this.suspendList);
    if (changes['visible'] && this.visible) { this.selectedItem = null; this.manualSuspendNo = ''; }
  }

  onRowSelect(event: { data?: SuspendListItem | SuspendListItem[] }) {
    if (event.data && !Array.isArray(event.data)) this.selectedItem = event.data;
  }

  confirmSuspend() {
    this.suspendConfirmed.emit();
    this.onCancel();
  }

  recallManual() {
    if (!this.manualSuspendNo.trim()) return;
    this.recallSelected$.emit(this.manualSuspendNo.trim());
    this.onCancel();
  }

  recallSelected() {
    if (!this.selectedItem) return;
    this.recallSelected$.emit(this.selectedItem.suspendNo);
    this.onCancel();
  }

  onCancel() {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
