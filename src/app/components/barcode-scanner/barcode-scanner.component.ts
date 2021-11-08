import { Component, OnDestroy } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { first } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { BarcodeFormat } from "@zxing/library";
import { faFileImport } from "@fortawesome/free-solid-svg-icons/faFileImport";
import { faForward } from "@fortawesome/free-solid-svg-icons/faForward";
import { IconDefinition } from "@fortawesome/fontawesome-common-types";

import { User } from '@/models';

import { ScanStatus } from "@/enums";

import { AlertService, AuthenticationService, PackageService } from '@/services';
import { PackageManualAddComponent } from "@/components";

@Component({ templateUrl: 'barcode-scanner.component.html' })
export class BarcodeScannerComponent implements OnDestroy {
    private getSubscription: Subscription;
    private putSubscription: Subscription;

    public faFileImport: IconDefinition = faFileImport;
    public faForward: IconDefinition = faForward;

    public showScanner = true;

    public loading: boolean = false;

    public currentUser: User;
    public formatsEnabled: BarcodeFormat[] = [
        BarcodeFormat.CODE_128,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.EAN_13
    ];

    constructor(private formBuilder: FormBuilder,
                private modalService: BsModalService,
                private authenticationService: AuthenticationService,
                private alertService: AlertService,
                private packageService: PackageService) {
        this.currentUser = this.authenticationService.currentUserValue;
    }

    private updatePackageStatus(orderId: string): void {
        this.putSubscription = this.packageService
            .updateScanStatusByBarcode(this.currentUser.userId, orderId).subscribe();
    }

    public onCodeResult(orderId: string): void {
        this.getSubscription = this.packageService
            .getPackageByBarcode(this.currentUser.userId, orderId)
            .pipe(first())
            .subscribe((response) => {
                if (!response.data) {
                    return this.openManualAddModal(orderId);
                }

                let stopNo = response.data ? response.data.stopNumber : 'N/A';
                let driver = response.data ? response.data.driver : 'N/A';

                this.alertService
                    .primary(`Order ID: ${orderId}, Driver: ${driver}, Stop No: ${stopNo}`);

                if (response.data && response.data.scanStatus === ScanStatus.PENDING) {
                    this.updatePackageStatus(orderId);
                }
            });
    }

    public openManualAddModal(orderId: string): void {
        this.showScanner = false;
        this.loading = true;

        const modalRef: BsModalRef = this.modalService.show(
            PackageManualAddComponent,
            {ignoreBackdropClick: true});
        modalRef.content.barcodeId = orderId;
        modalRef.content.faSave = this.faFileImport;
        modalRef.content.faForward = this.faForward;
        modalRef.content.saveClick.subscribe(() => this.showScanner = true);
        modalRef.content.cancelClick.subscribe(() => this.showScanner = true);
    }

    public ngOnDestroy(): void {
        if (this.getSubscription) {
            this.getSubscription.unsubscribe();
        }

        if (this.putSubscription) {
            this.putSubscription.unsubscribe();
        }
    }
}
