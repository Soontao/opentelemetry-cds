/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable prefer-rest-params */
import {
  InstrumentationConfig,
  InstrumentationModuleDefinition,
  InstrumentationNodeModuleDefinition,
  InstrumentationNodeModuleFile
} from "@opentelemetry/instrumentation";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import { CDSSemanticAttributes } from "../attributes";
import { version } from "../version.json";
import { CDSBaseServiceInstrumentation } from "./CDSBaseInstrumentation";
import { getEntityNameFromQuery } from "./utils";

export class CDSServiceInstrumentation extends CDSBaseServiceInstrumentation {

  constructor(options: InstrumentationConfig = {}) {
    super("CDSServiceInstrumentation", version, options);
  }

  protected init(): InstrumentationModuleDefinition<any> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      "@sap/cds",
      ["5.*"]
    );

    module.files.push(
      this._createPatchForServiceDispatch(),
      this._createPatchForServiceHandler(),
    );

    return module;
  }

  private _createPatchForServiceHandler() {
    const handlerRegisterHooks = ["before", "on", "after"];
    const moduleName = "@sap/cds/lib/serve/Service-handlers.js";
    return new InstrumentationNodeModuleFile<any>(
      moduleName,
      ["*"],
      moduleExport => {
        const inst = this;
        for (const handlerRegisterHook of handlerRegisterHooks) {
          this._wrap(moduleExport.prototype, handlerRegisterHook, (original: any) => {
            return function (this: any) {
              const handler = arguments[arguments.length - 1];
              if (typeof handler === "function") {
                const proxyHandler = inst._createWrapForNormalFunction(
                  "handler proxy",
                  handler,
                  {},
                  {
                    startExecutionHook: (span, thisValue, args) => {
                      const { name } = thisValue;
                      switch (handlerRegisterHook) {
                        case "on": case "before":
                          span.setAttributes(inst._extractAttributesFromReq(args?.[0]));
                          break;
                        case "after":
                          span.setAttributes(inst._extractAttributesFromReq(args?.[1]));
                          break;
                      }
                      span.updateName(`${name} - hook ${handlerRegisterHook} ${handler.name || "<anonymous>"}`);
                    }
                  }
                );
                return original.apply(this, Array.from(arguments).slice(0, arguments.length - 1).concat(proxyHandler));
              }
              return original.apply(this, arguments);
            };
          });

        }
        return moduleExport;
      },
      moduleExport => {
        for (const handlerRegisterFunction of handlerRegisterHooks) {
          this._unwrap(moduleExport.prototype, handlerRegisterFunction);
        }
      }
    );
  }

  private _createPatchForServiceDispatch() {
    const moduleName = "@sap/cds/lib/serve/Service-dispatch.js";
    return new InstrumentationNodeModuleFile<any>(
      moduleName,
      ["*"],
      /**
       * @param exportedModule 
       */
      (exportedModule) => {
        this._wrap(exportedModule, "dispatch", (original: any) => {

          return this._createWrapForNormalFunction(
            "cds.Service.dispatch",
            original,
            {},
            {
              startExecutionHook: (span, thisValue, args) => {
                const { name, kind } = thisValue;

                const req = args?.[0] ?? {};
                const attributes = {
                  [SemanticAttributes.CODE_FILEPATH]: moduleName,
                  [SemanticAttributes.CODE_FUNCTION]: "dispatch",
                  [CDSSemanticAttributes.CDS_SERVICE_KIND]: kind,
                  [CDSSemanticAttributes.CDS_SERVICE_NAME]: name,
                  ...this._extractAttributesFromReq(req),
                };

                if (kind === "app-service") {
                  attributes[CDSSemanticAttributes.APP_SERVICE_NAME] = name;
                }

                if (name === "db") {
                  // if is database service
                  attributes[SemanticAttributes.DB_OPERATION] = Object.keys(req?.query ?? {})?.[0] ?? req?.method ?? "Unknown";
                  attributes[SemanticAttributes.DB_SYSTEM] = kind;
                }

                span.setAttributes(attributes);

                const spanParts = [
                  kind,
                  name,
                  "-",
                  req?.event ?? req?.query instanceof Array ? "MULTI OPERATION" : undefined,
                  req?.target?.name ?? getEntityNameFromQuery(req?.query),
                ];

                span.updateName(spanParts.filter(Boolean).join(" "));

              }
            }
          );
        });
        return exportedModule;
      },
      (exportedModule) => {
        this._unwrap(exportedModule, "dispatch");
      },
    );
  }

  protected _extractAttributesFromReq(req: any) {
    if (typeof req !== "object") {
      return {};
    }
    return {
      [SemanticAttributes.ENDUSER_ID]: req?.user?.id,
      [CDSSemanticAttributes.CDS_TENANT_ID]: req?.tenant,
      [CDSSemanticAttributes.CDS_REQUEST_TARGET]: req?.target,
      [CDSSemanticAttributes.CDS_REQUEST_EVENT]: req?.event,
      [CDSSemanticAttributes.CDS_REQUEST_ID]: req?.id,
      [CDSSemanticAttributes.CDS_QUERY_ENTITIES]: getEntityNameFromQuery(req?.query),
    };
  }

}
