import {
  ActionData,
  ActionDataState,
} from "reducers/entityReducers/actionsReducer";
import { WidgetProps } from "widgets/BaseWidget";
import { ActionResponse } from "api/ActionAPI";
import { CanvasWidgetsReduxState } from "reducers/entityReducers/canvasWidgetsReducer";
import { MetaState } from "reducers/entityReducers/metaReducer";
import { PageListPayload } from "constants/ReduxActionConstants";
import WidgetFactory from "utils/WidgetFactory";
import { ActionConfig, PluginType, Property } from "entities/Action";
import { AppDataState } from "reducers/entityReducers/appReducer";
import _ from "lodash";

export type ActionDescription<T> = {
  type: string;
  payload: T;
};

export type ActionDispatcher<T, A extends string[]> = (
  ...args: A
) => ActionDescription<T>;

export enum ENTITY_TYPE {
  ACTION = "ACTION",
  WIDGET = "WIDGET",
  APPSMITH = "APPSMITH",
}

export type RunActionPayload = {
  actionId: string;
  onSuccess: ActionDescription<any>[];
  onError: ActionDescription<any>[];
  params: Record<string, any>;
};

export interface DataTreeAction extends Omit<ActionData, "data" | "config"> {
  data: ActionResponse["body"];
  actionId: string;
  config: Partial<ActionConfig>;
  pluginType: PluginType;
  name: string;
  run?: ActionDispatcher<RunActionPayload, [string, string, string]>;
  dynamicBindingPathList: Property[];
  ENTITY_TYPE: ENTITY_TYPE.ACTION;
}

export interface DataTreeWidget extends WidgetProps {
  ENTITY_TYPE: ENTITY_TYPE.WIDGET;
}

export interface DataTreeAppsmith extends AppDataState {
  ENTITY_TYPE: ENTITY_TYPE.APPSMITH;
  store: object;
}

export type DataTreeEntity =
  | DataTreeAction
  | DataTreeWidget
  | PageListPayload
  | DataTreeAppsmith
  | ActionDispatcher<any, any>;

export type DataTree = {
  [entityName: string]: DataTreeEntity;
} & { actionPaths?: string[] };

type DataTreeSeed = {
  actions: ActionDataState;
  widgets: CanvasWidgetsReduxState;
  widgetsMeta: MetaState;
  pageList: PageListPayload;
  appData: AppDataState;
};

export class DataTreeFactory {
  static create({
    actions,
    widgets,
    widgetsMeta,
    pageList,
    appData,
  }: DataTreeSeed): DataTree {
    const dataTree: DataTree = {};
    actions.forEach(a => {
      const config = a.config;
      let dynamicBindingPathList: Property[] = [];
      // update paths
      if (
        config.dynamicBindingPathList &&
        config.dynamicBindingPathList.length
      ) {
        dynamicBindingPathList = config.dynamicBindingPathList.map(d => ({
          ...d,
          key: `config.${d.key}`,
        }));
      }
      dataTree[config.name] = {
        ...a,
        actionId: config.id,
        name: config.name,
        pluginType: config.pluginType,
        config: config.actionConfiguration,
        dynamicBindingPathList,
        data: a.data ? a.data.body : {},
        ENTITY_TYPE: ENTITY_TYPE.ACTION,
      };
    });
    Object.keys(widgets).forEach(w => {
      const widget = { ...widgets[w] };
      const widgetMetaProps = widgetsMeta[w];
      const defaultMetaProps = WidgetFactory.getWidgetMetaPropertiesMap(
        widget.type,
      );
      const derivedPropertyMap = WidgetFactory.getWidgetDerivedPropertiesMap(
        widget.type,
      );
      const derivedProps: any = {};
      const dynamicBindings = { ...widget.dynamicBindings } || {};
      Object.keys(dynamicBindings).forEach(propertyName => {
        if (_.isObject(widget[propertyName])) {
          // Stringify this because composite controls may have bindings in the sub controls
          widget[propertyName] = JSON.stringify(widget[propertyName]);
        }
      });
      Object.keys(derivedPropertyMap).forEach(propertyName => {
        derivedProps[propertyName] = derivedPropertyMap[propertyName].replace(
          /this./g,
          `${widget.widgetName}.`,
        );
        dynamicBindings[propertyName] = true;
      });
      dataTree[widget.widgetName] = {
        ...widget,
        ...defaultMetaProps,
        ...widgetMetaProps,
        ...derivedProps,
        dynamicBindings,
        ENTITY_TYPE: ENTITY_TYPE.WIDGET,
      };
    });

    // if (withFunctions) {
    //   dataTree.navigateTo = function(pageNameOrUrl: string, params: object) {
    //     return {
    //       type: "NAVIGATE_TO",
    //       payload: { pageNameOrUrl, params },
    //     };
    //   };
    //   actionPaths.push("navigateTo");
    //
    //   dataTree.showAlert = function(message: string, style: string) {
    //     return {
    //       type: "SHOW_ALERT",
    //       payload: { message, style },
    //     };
    //   };
    //   actionPaths.push("showAlert");
    //
    //   // dataTree.url = url;
    //   dataTree.showModal = function(modalName: string) {
    //     return {
    //       type: "SHOW_MODAL_BY_NAME",
    //       payload: { modalName },
    //     };
    //   };
    //   actionPaths.push("showModal");
    //
    //   dataTree.closeModal = function(modalName: string) {
    //     return {
    //       type: "CLOSE_MODAL",
    //       payload: { modalName },
    //     };
    //   };
    //   actionPaths.push("closeModal");
    //
    //   dataTree.storeValue = function(key: string, value: string) {
    //     return {
    //       type: "STORE_VALUE",
    //       payload: { key, value },
    //     };
    //   };
    //   actionPaths.push("storeValue");
    //
    //   dataTree.download = function(data: string, name: string, type: string) {
    //     return {
    //       type: "DOWNLOAD",
    //       payload: { data, name, type },
    //     };
    //   };
    //   actionPaths.push("download");
    // }

    dataTree.pageList = pageList;
    // dataTree.actionPaths = actionPaths;
    dataTree.appsmith = {
      ENTITY_TYPE: ENTITY_TYPE.APPSMITH,
      ...appData,
    };
    return dataTree;
  }
}
