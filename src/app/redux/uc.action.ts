import { Action } from '@ngrx/store';
import { CLICK_ACTION, UPDATE_DATA, UPDATE_ORDER, UPDATE_SEARCH, UPDATE_SETTINGS } from './uc.reducers';
import { Criteria } from '../components/comparison/configuration/configuration';

export class UCAction implements Action {
    type: string;
    value: number;
}

export class UCRouterAction extends UCAction {
    payload: any;
}

export class UCDataUpdateAction extends UCAction {
    type = UPDATE_DATA;

    constructor(public criterias: Map<string, Criteria>) {
        super();
    }
}

export class UCSearchUpdateAction extends UCAction {
    type = UPDATE_SEARCH;

    constructor(public criterias: Map<string, string>) {
        super();
    }
}

export class UCTableOrderAction extends UCAction {
    type = UPDATE_ORDER;

    constructor(public index: number, public ctrl: boolean) {
        super();
    }
}

export class UCSettingsUpdateAction extends UCAction {
    type = UPDATE_SETTINGS;

    constructor(public enable: boolean, public operation: string) {
        super();
    }
}

export class UCClickAction extends UCAction {
    type = CLICK_ACTION;

    constructor(public val: string, public index: number) {
        super();
    }
}
