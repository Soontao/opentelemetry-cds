/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable prefer-rest-params */
import {
  InstrumentationConfig,
  InstrumentationModuleDefinition,
  InstrumentationNodeModuleDefinition,
  InstrumentationNodeModuleFile
} from "@opentelemetry/instrumentation";
import { version } from "../version.json";
import { CDSBaseServiceInstrumentation } from "./CDSBaseInstrumentation";
import { extractAttributesFromReq } from "./utils";

export class CDSEventInstrumentation extends CDSBaseServiceInstrumentation {

  constructor(options: InstrumentationConfig = {}) {
    super("CDSEventInstrumentation", version, options);
  }

  protected init(): InstrumentationModuleDefinition<any> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      "@sap/cds",
      ["6.*", "7.*"],
    );

    module.files.push(
      this._createPatchForEvent(),
    );

    return module;
  }

  private _createPatchForEvent() {
    const listenerRegister = ["before", "on", "once"];
    const moduleName = "@sap/cds/lib/req/context.js";
    return new InstrumentationNodeModuleFile<any>(
      moduleName,
      ["*"],
      moduleExport => {
        const inst = this;
        for (const handlerRegisterHook of listenerRegister) {
          this._wrap(moduleExport.prototype, handlerRegisterHook, (original: any) => {
            return inst._createWrapForNormalFunction(
              `EventContext.register`,
              original,
              {},
              {
                executionHook: (span, thisValue, original, args) => {
                  const [eventName, eventListener] = args;

                  span.updateName([
                    `EventContext.register.${handlerRegisterHook}`,
                    "-",
                    eventName,
                    eventListener.name || "<anonymous>"
                  ].join(" "));

                  if (typeof eventListener === "function") {

                    // event listener proxy
                    const proxyHandler = inst._createWrapForNormalFunction(
                      [
                        "EventContext.emit",
                        handlerRegisterHook,
                        eventName,
                        "-",
                        "listener",
                        eventListener.name || "<anonymous>"
                      ].join(" "),
                      eventListener,
                      {},
                      {
                        beforeExecutionHook(span, thisValue) {
                          span.setAttributes(extractAttributesFromReq(thisValue));
                        }
                      }
                    );

                    return original.apply(thisValue, Array.from(args).slice(0, args.length - 1).concat(proxyHandler));
                  }
                  return original.apply(thisValue, args);
                }
              }
            );
          });
        }

        return moduleExport;
      },
      moduleExport => {
        for (const handlerRegisterFunction of listenerRegister) {
          this._unwrap(moduleExport.prototype, handlerRegisterFunction);
        }
      }
    );
  }


}
