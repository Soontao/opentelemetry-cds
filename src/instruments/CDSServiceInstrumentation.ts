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
import path from "path";
import { CDSSemanticAttributes } from "../attributes";
import { version } from "../version.json";
import { CDSBaseServiceInstrumentation } from "./CDSBaseInstrumentation";
import { extractAttributesFromReq, findObjectInRequireCache } from "./utils";

export class CDSServiceInstrumentation extends CDSBaseServiceInstrumentation {

  constructor(options: InstrumentationConfig = {}) {
    super("CDSServiceInstrumentation", version, options);
  }

  protected init(): InstrumentationModuleDefinition<any> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      "@sap/cds",
      ["5.*", "6.*"]
    );

    module.files.push(
      this._createPatchForServiceHandler(),
    );

    return module;
  }

  private _createPatchForServiceHandler() {
    const handlerRegisterHooks = ["before", "on", "after"];
    const moduleName = "@sap/cds/lib/srv/srv-handlers.js";
    return new InstrumentationNodeModuleFile<any>(
      moduleName,
      [">=6.4 <7.0"],
      moduleExport => {
        const inst = this;
        for (const handlerRegisterHook of handlerRegisterHooks) {
          this._wrap(moduleExport.prototype, handlerRegisterHook, (original: any) => {
            return function (this: any) {
              const handler = arguments[arguments.length - 1];
              if (typeof handler === "function") {
                // try to get filepath for function
                const wrapOpt: any = { attributes: {} };
                const m = findObjectInRequireCache(handler);
                if (m !== undefined) {
                  wrapOpt.attributes[SemanticAttributes.CODE_FILEPATH] = path.relative(process.cwd(), m.filename);
                }
                const proxyHandler = inst._createWrapForNormalFunction(
                  "handler proxy",
                  handler,
                  wrapOpt,
                  {
                    beforeExecutionHook: (span, thisValue, args) => {
                      const { name } = thisValue;
                      let attributes: any = {};
                      switch (handlerRegisterHook) {
                        case "on": case "before":
                          attributes = extractAttributesFromReq(args?.[0]);
                          break;
                        case "after":
                          attributes = extractAttributesFromReq(args?.[1]);
                          break;
                      }
                      span.setAttributes(attributes);
                      const event = attributes?.[CDSSemanticAttributes.CDS_REQUEST_EVENT];
                      if (typeof event === "string") {
                        span.updateName(`${name} - hook ${handlerRegisterHook} - event ${event} - ${handler.name || "<anonymous>"}`);
                      } else {
                        span.updateName(`${name} - hook ${handlerRegisterHook} - ${handler.name || "<anonymous>"}`);
                      }
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



}
