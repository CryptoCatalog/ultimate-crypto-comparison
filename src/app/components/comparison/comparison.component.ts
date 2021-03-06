import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { VersionInformation } from '../../../assets/VersionInformation';
import { PaperCardComponent } from '../polymer/paper-card/paper-card.component';
import { LatexTableComponent } from '../output/latex-table/latex-table.component';
import { Store } from '@ngrx/store';
import { IUCAppState } from '../../redux/uc.app-state';
import { ConfigurationService } from './configuration/configuration.service';
import { Criteria } from './configuration/configuration';
import { DataService } from './data/data.service';
import { Data, Label } from './data/data';
import { UCClickAction, UCSearchUpdateAction, UCTableOrderAction } from '../../redux/uc.action';
import { isNullOrUndefined } from 'util';

import { saveAs } from 'file-saver';
import {forEach} from "@angular/router/src/utils/collection";

@Component({
    selector: 'comparison',
    templateUrl: './comparison.template.html',
    styleUrls: ['./comparison.component.css']
})
export class ComparisonComponent {
    @ViewChild(LatexTableComponent) latexTable: LatexTableComponent;
    @ViewChild('genericTableHeader') genericTableHeader: PaperCardComponent;
    public activeRow: Data = new Data.Builder().build();

    public detailsOpen = false;
    public settingsOpen = false;

    public changed = 0;
    private versionInformation: VersionInformation = new VersionInformation();

    private searchableCriteria: Array<Criteria>;

    constructor(public configurationService: ConfigurationService,
                private cd: ChangeDetectorRef,
                public store: Store<IUCAppState>) {
        this.configurationService.loadComparison(this.cd);
        for (const crit of this.configurationService.criteria) {
            if (crit.search) {
                this.searchableCriteria.push(crit);
            }
        }
    }

    public getVersionInformation(): VersionInformation {
        return this.versionInformation;
    }

    public criteriaChanged(value: string, crit: Criteria) {
        const map = new Map<string, string>();
        map.set(crit.key, value || null);
        this.store.dispatch(new UCSearchUpdateAction(map));
        this.cd.markForCheck();
    }

    public searchText(value: string) {
        this.cd.markForCheck();
    }

    public getActive(state: { state: IUCAppState }, crit: Criteria) {
        if (isNullOrUndefined(state)) {
            return [];
        }
        const active = state.state.currentSearch.get(crit.key);

        if (!isNullOrUndefined(active)) {
            return active.map(name => {
                return {
                    id: name,
                    text: name
                }
            });
        }

        return [];
    }

    public showDetails(index: number) {
        this.activeRow = DataService.data[index];
        this.detailsOpen = true;
    }

    public deferredUpdate() {
        setTimeout(() => {
            this.changed > 0 ? (this.changed = this.changed - 100) : (this.changed = this.changed + 100);
        }, 100);
    }

    public latexDownload() {
        let content: string = this.latexTable.element.nativeElement.textContent;
        content = content.substr(content.indexOf('%'), content.length);
        const blob: Blob = new Blob([content], {type: 'plain/text'});
        saveAs(blob, 'latextable.tex');
        return window.URL.createObjectURL(blob);
    }

    /**
     * Callback functions dispatching to redux store
     */
    public changeOrder(change: { index: number, ctrl: boolean }) {
        if (!isNullOrUndefined(change)) {
            this.store.dispatch(new UCTableOrderAction(change.index, change.ctrl));
        }
    }

    public criteriaClicked(val: { event: MouseEvent, key: Label, index: number }) {
        this.store.dispatch(new UCClickAction(val.key.name, val.index));
    }
}
