import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
    selector: 'iicon',
    templateUrl: './iron-icon.component.html',
    styleUrls: ['./iron-icon.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IronIconComponent {
    @Input() icon: string;
}
