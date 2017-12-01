import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { Criteria, CriteriaSelection, Data } from '../shared/index';
import { ComparisonConfigService } from './comparison-config.service';
import { ComparisonDataService } from './comparison-data.service';
import { ComparisonService } from './comparison.service';
import { ComparisonCitationService } from './comparison-citation.service';
import { VersionInformation } from '../../../VersionInformation';
import { LocalStorageService } from 'angular-2-local-storage';
import { TableData } from '../shared/components/table-data';
import { PaperCardComponent } from "../../polymer/paper-card/paper-card.component";
import { LatexTableComponent } from '../../output/latex-table/latex-table.component';
import { HttpClient } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { IUCAppState } from '../../../redux/app.app-state';
import { UPDATE_FILTER } from '../../../redux/app.reducers';

const FileSaver = require('file-saver');

@Component({
    selector: 'comparison',
    templateUrl: '../templates/comparison.template.html',
    styleUrls: ['../styles/comparison.component.css']
})
export class ComparisonComponent {
    criteriaSelection = [];
    private query: { [name: string]: CriteriaSelection; } = {};
    private changed = 0;
    private order: Array<String> = [];
    private orderOption: Array<number> = [];
    private ready = false;
    private versionInformation: VersionInformation = new VersionInformation();
    @ViewChild('details') detailsModal: any;
    private activeRow: Data = new Data(this.lss, this.dataServ, this.serv);
    private showTable = false;
    private showTableTooltips = true;
    private tableTooltipsAsFootnotes = false;
    @ViewChild(LatexTableComponent) latexTable: LatexTableComponent;
    @ViewChild('settings') settingsModal: any;
    @ViewChild('genericTableHeader') genericTableHeader: PaperCardComponent;
    private expandShrinkOrigDisplay: Array<TableData> = [];
    public shrinked = true;

    constructor(public serv: ComparisonService,
                public dataServ: ComparisonDataService,
                public confServ: ComparisonConfigService,
                public citationServ: ComparisonCitationService,
                private cd: ChangeDetectorRef,
                private lss: LocalStorageService,
                private store: Store<IUCAppState>) {
        this.confServ.loadComparison(this.cd);
        this.confServ.loadCriteria(this.cd);
        this.confServ.loadTableData(this.cd);
        this.confServ.loadDescription(this.cd);
        this.citationServ.loadCitationData(this.cd);
    }

    public getVersionInformation(): VersionInformation {
        return this.versionInformation;
    }

    public criteriaChanged(value: Array<String> | KeyboardEvent | { target: { value: string }}, crit: Criteria) {
        if (value) {
            this.store.dispatch({type: UPDATE_FILTER, value: new CriteriaSelection(value, crit)});
        }
        this.cd.markForCheck();

        this.change();
    }

    private showDetails(data: Data) {
        this.activeRow = data;
        this.detailsModal.open();
    }

    private showTableProperties() {
        this.settingsModal.open();
    }

    private downloadLatexTable() {
        console.log(this.latexTable.element.nativeElement)
        let content: string = this.latexTable.element.nativeElement.textContent;
        content = content.substr(content.indexOf('%'), content.length);
        const blob: Blob = new Blob([content], {type: 'plain/text'});
        FileSaver.saveAs(blob, 'latextable.tex');
        return window.URL.createObjectURL(blob);
    }

    private previewLatexTable() {
        this.latexTable.showTable = !this.latexTable.showTable;
    }

    public displayReferences(): boolean {
        if (this.citationServ.check && this.citationServ.references.length > 0 && !this.ready) {

            setTimeout(() => {
                this.ready = true;
            }, 1000);
        }
        return this.ready;
    }

    public change() {
        if (this.changed === 1) {
            this.changed = 0;
        } else {
            this.changed = 1;
        }
    }

    public changeDisplayTemplate() {
        if (this.confServ.comparison) {
            this.confServ.comparison.displaytemplate = !this.confServ.comparison.displaytemplate;
        }
        this.change();
    }

    public changeDisplayAll() {
        if (this.confServ.comparison) {
            this.confServ.comparison.displayall = !this.confServ.comparison.displayall;
        }
        this.change();
    }

    public changeEnabled(item: Data) {
        item.enabled = !item.enabled;
        this.change();
    }

    public shrinkExpand() {
        if (this.shrinked) {
            this.expand();
        } else {
            this.shrink();
        }
        this.shrinked = !this.shrinked;
        this.cd.markForCheck();
        this.change();
    }

    private shrink() {
        const set = this.confServ.tableDataSet.getTableDataArray();
        for (const td of set) {
            if (td.display && this.expandShrinkOrigDisplay.indexOf(td) === -1) {
                td.display = false;
            }
        }
    }

    private expand() {
        const set = this.confServ.tableDataSet.getTableDataArray();
        for (const td of set) {
            if (td.display) {
                this.expandShrinkOrigDisplay.push(td);
            } else {
                td.display = true;
            }
        }
    }
}
