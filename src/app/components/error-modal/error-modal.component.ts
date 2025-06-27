import { error } from 'console';
import { CommonModule } from "@angular/common";
import { Component, Inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatInputModule } from "@angular/material/input";
import { Subject } from "rxjs";

@Component({
  selector: 'app-error-modal',
  standalone: true,
  imports: [CommonModule,
    MatButtonModule,
    MatInputModule,
    MatDialogModule
  ],
  templateUrl: './error-modal.component.html',
})
export class ErrorModalComponent {

    isShow = true;
    errorText = '';
    private showLoader = new Subject<boolean>();
    public showLoader$ = this.showLoader.asObservable();

    constructor(
        private dialogRef: MatDialogRef<ErrorModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { errorText: string }
    ){
        this.errorText = this.data.errorText;
    }

    setError(errorText: string) {
        this.errorText = errorText;
    }

    onClose(): void {
        this.dialogRef.close();
    }

}