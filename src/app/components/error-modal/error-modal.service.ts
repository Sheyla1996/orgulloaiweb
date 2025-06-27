import { Injectable } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ErrorModalComponent } from "./error-modal.component";

@Injectable({ providedIn: 'root' })
export class ErrorModalService {

    constructor(
        private dialog: MatDialog
    ) {}

    openDialog(errorText: string): void {
        const dialogRef = this.dialog.open(ErrorModalComponent, {data: { errorText }});
        dialogRef.afterClosed().subscribe((result: any) => {});
    }

}