import { IUCAppState, UcAppState } from './uc.app-state';
import {
    UCAction,
    UCClickAction,
    UCDataUpdateAction,
    UCRouterAction,
    UCSearchUpdateAction,
    UCSettingsUpdateAction,
    UCTableOrderAction
} from './uc.action';
import { DataService } from '../components/comparison/data/data.service';
import { Criteria, CriteriaType } from '../components/comparison/configuration/configuration';
import { Data, Label, Markdown, Text, Url } from '../components/comparison/data/data';
import { isNullOrUndefined } from 'util';

export const UPDATE_SEARCH = 'UPDATE_SEARCH';
export const UPDATE_MODAL = 'UPDATE_MODAL';
export const UPDATE_FILTER = 'UPDATE_FILTER';
export const UPDATE_DATA = 'UPDATE_DATA';
export const UPDATE_ORDER = 'UPDATE_ORDER';
export const UPDATE_SETTINGS = 'UPDATE_SETTINGS';
const UPDATE_ROUTE = 'ROUTER_NAVIGATION';
export const CLICK_ACTION = 'CLICK_ACTION';

export function masterReducer(state: IUCAppState = new UcAppState(), action: UCAction) {
    if (action.type === UPDATE_ROUTE) {
        state.currentElements = [];
        state.currentSearch = new Map();
        state.currentFilter = [];
        state.currentDetails = -1;
    }
    switch (action.type) {
        case CLICK_ACTION:
            state = clickReducer(state, <UCClickAction>action);
            break;
        case UPDATE_SEARCH:
            state = searchReducer(state, <UCSearchUpdateAction>action);
            break;
        case UPDATE_MODAL:
            state = detailsReducer(state, action);
            break;
        case UPDATE_FILTER:
            state = filterReducer(state, action);
            break;
        case UPDATE_ROUTE:
            state = routeReducer(state, <UCRouterAction>action);
            break;
        case UPDATE_DATA:
            state.criterias = (<UCDataUpdateAction>action).criterias;
            state = initSettings(state);
            state = filterColumns(state);
            break;
        case UPDATE_ORDER:
            state = changeOrder(state, <UCTableOrderAction>action);
            state = sortElements(state);
            break;
        case UPDATE_SETTINGS:
            const act: UCSettingsUpdateAction = <UCSettingsUpdateAction>action;
            switch (act.operation) {
                case 'ColumnDisplayAll':
                    state = columnDisplayAll(state, act.enable);
                    state = filterColumns(state);
                    break;
                case 'ColumnChange':
                    state = columnDisplayChange(state, act.value);
                    state = filterColumns(state);
                    break;
                case 'ElementDisplayAll':
                    state.elementsEnabled = state.elementsEnabled.map(() => act.enable);
                    state.elementDisplayAll = act.enable;
                    break;
                case 'ElementChange':
                    state.elementsEnabled[act.value] = !state.elementsEnabled[act.value];
                    state.elementDisplayAll = state.elementsEnabled.filter(value => value).length === state.elementNames.length;
                    break;
                case 'TableExpand':
                    if (act.enable) {
                        state = columnDisplayAll(state, act.enable);
                    } else {
                        state.columnsEnabled = state.columnsEnabledCache;
                        state.columnDisplayAll = act.enable;
                    }
                    state = filterColumns(state);
                    state.tableExpand = act.enable;
                    break;
            }
            switch (act.operation) {
                case 'LatexDisplayTable':
                    state.latexDisplayTable = act.enable;
                    break;
                case 'LatexEnableTooltips':
                    state.latexEnableTooltips = act.enable;
                    break;
                case 'LatexTooltipsAsFootnotes':
                    state.latexTooltipsAsFootnotes = act.enable;
                    break;
                case 'SettingsOpenChange':
                    if (!act.enable && !state.columnDisplayAll) {
                        state.columnsEnabledCache = state.columnsEnabled;
                    }
                    break;
                case 'DetailsDisplayTooltips':
                    state.detailsDisplayTooltips = act.enable;
                    break;
            }
    }
    state = filterElements(state);
    state = sortElements(state);
    return state;
}

function clickReducer(state: IUCAppState, action: UCClickAction) {
    const column = state.currentColumns[action.index];
    const map = new Map<string, Array<string>>();
    const criteria = state.criterias.get(column);
    map.set(criteria.name, [action.val]);
    const search = state.currentSearch.get(criteria.name);
    if (criteria.rangeSearch) {
        if (search === undefined) {
            state.currentSearch.set(criteria.name, [action.val]);
        } else {
            state.currentSearch.set(criteria.name, [search[0] + ',' + action.val]);
        }
    } else {
        if (search === undefined) {
            state.currentSearch.set(criteria.name, [action.val]);
        } else {
            search.push(action.val);
            state.currentSearch.set(criteria.name, search);
        }
    }
    return state;
}


function columnDisplayChange(state: IUCAppState, index: number): IUCAppState {
    state.columnsEnabled[index] = !state.columnsEnabled[index];
    state.columnDisplayAll = state.columnsEnabled.filter(value => value).length === state.columnNames.length;
    state.tableExpand = state.columnDisplayAll;
    return state;
}

function columnDisplayAll(state: IUCAppState, enable: boolean): IUCAppState {
    state.columnsEnabled = state.columnsEnabled.map(() => enable);
    state.columnDisplayAll = enable;
    state.tableExpand = enable;
    return state;
}


function changeOrder(state: IUCAppState, action: UCTableOrderAction): IUCAppState {
    const key: string = state.currentColumns[action.index];
    const prefix: string = state.currentOrder.indexOf('+'.concat(key)) === -1 ? '+' : '-';

    if (action.ctrl) {
        const index = state.currentOrder.indexOf((prefix === '-' ? '+' : '-').concat(key));
        if (index !== -1) {
            state.currentOrder[index] = prefix.concat(key);
        } else {
            state.currentOrder.push(prefix.concat(key));
        }
    } else {
        state.columnOrder = [];
        state.currentOrder = [prefix + key];
    }

    state.columnOrder[action.index] = prefix === '+' ? 1 : -1;
    return state;
}

function updateElements(state: IUCAppState): IUCAppState {
    state.currentChanged = false;
    state = filterElements(state, state.criterias);
    state = sortElements(state);
    if (!state.currentChanged) {
        return state;
    }
    putStateIntoURL(state);
    return state;
}

function initSettings(state: IUCAppState): IUCAppState {
    // Set elements settings
    const elementNames: Array<string> = [];
    const elementsEnabled: Array<boolean> = [];
    DataService.data.forEach(value => {
        elementNames.push(value.name);
        if (value.name === "Template") {
            elementsEnabled.push(false);
        } else {
            elementsEnabled.push(true);
        }
    });
    state.elementNames = elementNames;
    state.elementsEnabled = elementsEnabled;
    state.elementDisplayAll = false;

    // Set column settings
    state = initColumn(state);

    // Set latex settings
    state.latexDisplayTable = false;
    state.latexEnableTooltips = false;
    state.latexTooltipsAsFootnotes = false;

    return state;
}

function initColumn(state: IUCAppState): IUCAppState {
    const columnKeys: Array<string> = [];
    const columnNames: Array<string> = [];
    const columnsEnabled: Array<boolean> = [];
    const columnsEnabledCache: Array<boolean> = [];
    state.criterias.forEach((value, key) => {
        const name: string = value.name.length === 0 ? key : value.name;
        columnKeys.push(key);
        columnNames.push(name);
        columnsEnabled.push(value.table);
        columnsEnabledCache.push(value.table);
    });
    state.columnKeys = columnKeys;
    state.columnNames = columnNames;
    state.columnsEnabled = columnsEnabled;
    state.columnsEnabledCache = columnsEnabledCache;
    state.columnDisplayAll = columnsEnabled.filter(value => value).length === columnNames.length;
    return state;
}

function putStateIntoURL(state: IUCAppState) {
    let query = '';
    if (state.currentSearch.size > 0) {
        query = 'search=';
        for (const [key, value] of state.currentSearch) {
            let crit = key;
            for (const val of value) {
                crit += `:${val}`;
            }
            query += `${encodeURIComponent(crit)};`;
        }
        query = query.substr(0, query.length - 1);
    }
    if (state.currentFilter.length > 0) {
        if (query.length > 0) {
            query += '&';
        }
        query += 'filter=';
        for (const filter of state.currentFilter) {
            query += `${filter},`;
        }
        query = query.substr(0, query.length - 1);
    }
    if (state.currentColumns.length > 0) {
        if (query.length > 0) {
            query += '&';
        }
        query += 'columns=';
        for (const column of state.currentColumns) {
            query += `${encodeURIComponent(column)},`;
        }
        query = query.substr(0, query.length - 1);
    }
    if (state.currentlyMaximized) {
        if (query.length > 0) {
            query += '&';
        }
        query += 'maximized=';
    }
    if (state.currentOrder.length > 0) {
        if (query.length > 0) {
            query += '&';
        }
        query += 'order=';
        for (const order of state.currentOrder) {
            query += `${encodeURIComponent(order)},`;
        }
        query = query.substr(0, query.length - 1);
    }
    if (query.length > 0) {
        window.history.pushState(state, '', '?' + query);
    }
}

function filterColumns(state: IUCAppState, columns: Map<string, boolean> = new Map()): IUCAppState {
    if (state.criterias === null) {
        return state;
    }

    const currentColumns = [];
    state.columnKeys.forEach((value, index) => {
        if (state.columnsEnabled[index]) {
            currentColumns.push(value);
        }
    });
    state.currentColumns = currentColumns;

    const columnNames = [];
    const columnTypes = [];
    state.currentColumns.forEach(key => {
        const criteria: Criteria = state.criterias.get(key);
        columnNames.push(criteria.name);
        columnTypes.push(criteria.type);
    });
    state.currentColumnNames = columnNames;
    state.columnTypes = columnTypes;

    const columnOrder = [];
    state.currentOrder.forEach(pk => {
        let index;
        if (pk.startsWith('-') && (index = state.currentColumns.indexOf(pk.substring(1))) !== -1) {
            columnOrder[index] = -1;
        } else if (pk.startsWith('+') && (index = state.currentColumns.indexOf(pk.substring(1))) !== -1) {
            columnOrder[index] = 1;
        } else if ((index = state.currentColumns.indexOf(pk)) !== -1) {
            columnOrder[index] = 1;
        }
    });
    state.columnOrder = columnOrder;

    return state;
}

function filterElements(state: IUCAppState, criterias: Map<string, Criteria> = null) {
    if (state.criterias === null && criterias !== null) {
        state.criterias = criterias;
        state.currentChanged = true;
    }
    if (state.criterias === null) {
        return state;
    }
    const data: Array<Data> = DataService.data;
    const elements: Array<Array<String | Array<Label> | Text | Url | Markdown | number>> = [];
    const indexes: Array<number> = [];


    DataService.data.forEach((value, i) => {
        if (state.currentFilter.indexOf(i) !== -1 || !state.elementsEnabled[i]) {
            return;
        }
        let includeData = true;
        for (const field of state.currentSearch.keys()) {
            const criteria = state.criterias.get(field);

            if (criteria.textSearch) {
                // Full text search
                const searchArray = state.currentSearch.get(field);
                let fulfillsField = criteria.andSearch || isNullOrUndefined(searchArray) || searchArray.length === 0;
                for (const query of searchArray) {
                    if (query === '') {
                        continue;
                    }
                    const queryLower = query.toLocaleLowerCase();
                    const val = (<Url>data[i].criteria.get(criteria.key)).text
                        || (<Text>data[i].criteria.get(criteria.key)).content
                        || (<Markdown>data[i].criteria.get(criteria.key)).content;
                    const fulfillsQuery = (val.toLocaleLowerCase().indexOf(queryLower) > -1);

                    if (criteria.andSearch) {
                        fulfillsField = fulfillsField && fulfillsQuery;
                    } else {
                        fulfillsField = fulfillsField || fulfillsQuery;
                    }
                }
                includeData = includeData && fulfillsField;
            } else if (criteria.rangeSearch) {
                if (state.currentSearch.get(field).length > 0) {
                    const queries = (state.currentSearch.get(field)[0] || '').trim().replace(' ', '')
                        .replace(/,.*[a-zA-Z].*|.*[a-zA-Z].*,|.*[a-zA-Z].*/g, '').split(',');
                    if (queries.length === 0 || queries.map(y => y.length === 0).reduce((p, c) => p && c)) {
                        continue;
                    }
                    let includeElement = false;
                    for (const query of queries) {
                        const splits = query.split('-');
                        let a = Number.MAX_VALUE;
                        let b = Number.MIN_VALUE;
                        if (splits.length === 1) {
                            a = b = Number.parseInt(splits[0]);
                            // only one number in the query
                        } else if (splits.length === 2 && splits[0].length === 0) {
                            // only one number in the query and it is negative
                            a = b = -1 * Number.parseInt(splits[1]);
                        } else if (splits.length === 2 && splits[0].length > 0 && splits[1].length > 0) {
                            // range search with two positive numbers
                            a = Number.parseInt(splits[0]);
                            b = Number.parseInt(splits[1]);
                            if (a > b) {
                                const c = b;
                                b = a;
                                a = c;
                            }
                        } else if (splits.length === 2 && splits[0].length > 0 && splits[1].length === 0) {
                            // intermittent range search, something like `250-` inbetween entering valid states
                            a = b = Number.parseInt(splits[0]);
                        } else if (splits.length === 3 && splits[0].length === 0 && splits[2].length === 0) {
                            // intermittent range search, something like `-250-` inbetween entering valid states
                            a = b = -1 * Number.parseInt(splits[1]);
                        } else if (splits.length === 3 && splits[0].length === 0 && splits[2].length > 0) {
                            // range search with first number negative
                            a = -1 * Number.parseInt(splits[1]);
                            b = Number.parseInt(splits[2]);
                        } else if (splits.length === 3 && splits[1].length === 0) {
                            // range search with second number negative
                            a = -1 * Number.parseInt(splits[2]);
                            b = Number.parseInt(splits[0]);
                        } else if (splits.length === 4 && splits[0].length === 0 && splits[2].length === 0) {
                            // range search with both numbers negative
                            a = -1 * Number.parseInt(splits[0]);
                            b = -1 * Number.parseInt(splits[1]);
                            if (a > b) {
                                const c = b;
                                b = a;
                                a = c;
                            }
                        }
                        const labelMap: Map<string, Label> = <Map<string, Label>>value.criteria.get(field);
                        for (const val of labelMap.keys()) {
                            const numberVal = Number.parseInt(val);
                            if (a <= numberVal && numberVal <= b) {
                                includeElement = true;
                                break;
                            }
                        }
                    }
                    includeData = includeData && includeElement;
                }
            } else {
                const searchArray = state.currentSearch.get(field);
                let fulfillsField = criteria.andSearch || isNullOrUndefined(searchArray) || searchArray.length === 0;
                for (const query of searchArray) {
                    let fulfillsQuery = false;
                    for (const key of (<Map<string, any>>data[i].criteria.get(criteria.key)).keys()) {
                        fulfillsQuery = fulfillsQuery || (key === query);
                    }
                    if (criteria.andSearch) {
                        fulfillsField = fulfillsField && fulfillsQuery;
                    } else {
                        fulfillsField = fulfillsField || fulfillsQuery;
                    }
                }
                includeData = includeData && fulfillsField;
            }
        }

        if (includeData) {
            const dataElement: Data = data[i];
            const item: Array<Array<Label> | Text | Url | Markdown | number> = [];
            state.currentColumns.forEach((key, index) => {
                const obj: any = dataElement.criteria.get(key);
                if (state.columnTypes[index] === CriteriaType.label) {
                    const labelMap: Map<string, Label> = obj || new Map;
                    const labels: Array<Label> = [];
                    labelMap.forEach(label => labels.push(label));
                    item.push(labels);
                } else if (state.columnTypes[index] === CriteriaType.rating) {
                    item.push(dataElement.averageRating);
                } else if (state.columnTypes[index] === CriteriaType.repository) {
                    item.push(obj);
                } else {
                    item.push(obj);
                }
            });

            elements.push(item);
            indexes.push(i);

        }
    });

    if (state.rowIndexes.length !== indexes.length) {
        state.currentChanged = true;
    } else {
        for (let i = 0; i < indexes.length; i++) {
            state.currentChanged = state.currentChanged || indexes[i] === state.rowIndexes[i];
        }
    }
    state.rowIndexes = indexes;
    if (state.currentElements.length !== elements.length) {
        state.currentChanged = true;
    } else {
        for (let i = 0; i < elements.length; i++) {
            state.currentChanged = state.currentChanged || elements[i] === state.currentElements[i];
        }
    }
    state.currentElements = elements;
    return state;
}

function sortElements(state: IUCAppState): IUCAppState {
    if (state.currentOrder === null) {
        return state;
    }
    const keys: Array<number> = state.currentOrder.map(value => {
        const key: string = value.substring(1);
        if (state.currentColumns.indexOf(key) !== -1) {
            return state.currentColumns.indexOf(key);
        } else {
            return 0;
        }
    });
    const direction: Array<number> = state.currentOrder.map(key => {
        if (key.startsWith('+')) {
            return 1;
        } else if (key.startsWith('-')) {
            return -1;
        } else {
            // Default is positive (ascending)
            return 1;
        }
    });

    const combined: Array<{
        currentElements: Array<String | Array<Label> | Text | Url | Markdown | number>,
        indexes: number
    }> = [];
    state.currentElements.forEach((value, index) => combined.push({
        currentElements: value,
        indexes: state.rowIndexes[index]
    }));
    combined.sort((a, b) => sort(a.currentElements, b.currentElements, state.columnTypes, keys, direction));
    if (state.currentElements.length !== combined.length) {
        state.currentChanged = true;
    } else {
        for (let i = 0; i < combined.length; i++) {
            state.currentChanged = state.currentChanged ||
                state.currentElements[i] === combined[i].currentElements ||
                state.rowIndexes[i] === combined[i].indexes;
        }
    }
    state.currentElements = combined.map(element => element.currentElements);
    state.rowIndexes = combined.map(element => element.indexes);

    return state;
}

function sort(first: Array<String | Array<Label> | Text | Url | Markdown | number>,
              second: Array<String | Array<Label> | Text | Url | Markdown | number>,
              types: Array<CriteriaType>,
              keys: Array<number>,
              directions: Array<number>) {
    const stringCompare = (s1: string, s2: string) => {
        if (isNullOrUndefined(s1) && isNullOrUndefined(s2)) {
            return 0;
        }
        if (isNullOrUndefined(s1)) {
            return 1;
        }
        if (isNullOrUndefined(s2)) {
            return -1;
        }
        return s1.toLowerCase() > s2.toLowerCase() ? 1 : s1.toLowerCase() < s2.toLowerCase() ? -1 : 0;
    };
    const numberCompare = (n1: number, n2: number) => n1 > n2 ? 1 : n1 < n2 ? -1 : 0;

    if (isNullOrUndefined(first) && isNullOrUndefined(second) || first.length === 0 && second.length === 0) {
        return 0;
    }
    if (isNullOrUndefined(first) || first.length === 0 && second.length > 0) {
        return -1;
    }
    if (isNullOrUndefined(first) || first.length > 0 && second.length === 0) {
        return 1;
    }

    let result = 0;
    let index = 0;
    while (result === 0 && index < keys.length) {
        const a = first[keys[index]];
        const b = second[keys[index]];
        if (isNullOrUndefined(a) && isNullOrUndefined(b)) {
            result = 0;
        } else if (isNullOrUndefined(a)) {
            result = 1;
        } else if (isNullOrUndefined(b)) {
            result = -1;
        } else {
            switch (types[keys[index]]) {
                case 'repository':
                    const s1: string = <string>a;
                    const s2: string = <string>b;
                    result = stringCompare(s1, s2);
                    break;
                case 'url':
                    const u1: Url = <Url>a;
                    const u2: Url = <Url>b;
                    result = stringCompare(u1.text, u2.text);
                    break;
                case 'text':
                    const t1: Text = <Text>a;
                    const t2: Text = <Text>b;
                    result = stringCompare(t1.content, t2.content);
                    break;
                case 'markdown':
                    const md1: Markdown = <Markdown>a;
                    const md2: Markdown = <Markdown>b;
                    result = stringCompare(md1.content, md2.content);
                    break;
                case 'rating':
                    const r1: number = <number>a;
                    const r2: number = <number>b;
                    result = numberCompare(r1, r2);
                    break;
                case 'label':
                    const la1: Array<Label> = <Array<Label>>a;
                    const la2: Array<Label> = <Array<Label>>b;

                    // TODO improve label sorting (label weighting...)
                    const l1: Label = la1[0];
                    const l2: Label = la2[0];
                    if (isNullOrUndefined(l1) && isNullOrUndefined(l2)) {
                        result = 0;
                    } else if (isNullOrUndefined(l1)) {
                        result = 1;
                    } else if (isNullOrUndefined(l2)) {
                        result = -1;
                    } else {
                        result = stringCompare(l1.name, l2.name)
                    }
                    break;
                default:
                    result = 0;
            }
        }
        if (result === 0) {
            index++;
        }
    }
    return directions[index] * result;
}

function routeReducer(state: IUCAppState = new UcAppState(), action: UCRouterAction) {
    if (action.type !== UPDATE_ROUTE) {
        return state;
    }
    const params = action.payload.routerState.queryParams;
    const search = decodeURIComponent(params.search || params['?search'] || '');
    const filter = params.filter || params['?filter'] || '';
    const detailsDialog = Number.parseInt(params.details || params['?details'] || -1);
    const optionsDialog = params.hasOwnProperty('options') || params.hasOwnProperty('?options');
    const columns = params.columns || params['?columns'] || '';
    const maximized = params.hasOwnProperty('maximized') || params.hasOwnProperty('?maximized');
    const order = params.order || params['?order'] || '+id';

    search.split(';').map(x => x.trim()).forEach(x => {
        const splits = x.split(':');
        if (splits.length > 1) {
            // at least one filter is active
            const key = splits.splice(0, 1);
            state.currentSearch.set(key[0], splits);
        }
    });
    state.currentFilter = filter.split(',')
        .filter(x => x.trim().length > 0)
        .filter(x => Number.isInteger(x.trim()))
        .map(x => Number.parseInt(x.trim()));
    state.currentColumns = columns.split(',')
        .filter(x => x.trim().length > 0)
        .filter(x => Number.isInteger(x.trim()))
        .map(x => Number.parseInt(x.trim()));
    if (state.currentColumns.length === 0 && state.criterias) {
        const values = state.criterias.values();
        let crit;
        while ((crit = values.next()) !== null) {
            state.currentColumns.push(crit.name);
        }
    }
    state.currentlyMaximized = maximized;
    state.currentOrder = order.split(',').map(x => decodeURIComponent(x));
    return state;
}

function filterReducer(state: IUCAppState = new UcAppState(), action: UCAction) {
    return state;
}

function detailsReducer(state: IUCAppState = new UcAppState(), action: UCAction) {
    return state;
}

function searchReducer(state: IUCAppState = new UcAppState(), action: UCSearchUpdateAction) {
    for (const [key, value] of action.criterias) {
        const elements = state.currentSearch.get(key) || [];
        const index = elements.indexOf(value);

        if (state.criterias.get(key).textSearch) {
            if (value !== null) {
                let searchValues = value.split(' ');
                searchValues = searchValues.filter((v) => { return v !== ''; })
                state.currentSearch.set(key, searchValues || []);
            } else {
                state.currentSearch.set(key, []);
            }
        } else if (state.criterias.get(key).rangeSearch) {
            state.currentSearch.set(key, [value]);
        } else {
            if (value !== null && index > -1) {
                if (index > -1) {
                    elements.splice(index, 1);
                }
            } else if (value !== null) {
                const elements = state.currentSearch.get(key);
                if (isNullOrUndefined(elements)) {
                    state.currentSearch.set(key, [value]);
                } else {
                    elements.push(value);
                }
            }
        }
    }
    return state;
}
