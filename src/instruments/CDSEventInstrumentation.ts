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
import { LABELS } from "./constants";

export class CDSEventInstrumentation extends CDSBaseServiceInstrumentation {

  constructor(options: InstrumentationConfig = {}) {
    super("cds-request", version, options);
  }

  protected init(): InstrumentationModuleDefinition<any> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      "@sap/cds",
      ["6.*", "7.*"],
    );

    module.files.push(
      this._createPatchForEvent(),
      this._createPatchForSpawn(),
    );

    return module;
  }

  private _createPatchForSpawn() {
    return new InstrumentationNodeModuleFile<any>(
      "@sap/cds/lib/req/cds-context.js",
      ["*"],
      (moduleExport) => {
        this._wrap(moduleExport, "spawn", (original: any) => {
          return this._createWrapForNormalFunction("cds.spawn", original, {}, {
            executionHook: (span, thisValue, original, args) => {
              const [o, fn, cds] = args;
              if (typeof fn === "function") {
                const newFn = this._createWrapForNormalFunction(
                  `spawn task execution ${fn.name ?? LABELS.ANTONYMOUS_FUNC}`,
                  fn,
                );
                return original.apply(thisValue, [o, newFn, cds]);
              }
              return original.apply(thisValue, args);

            }
          });
        });
        this._wrap(moduleExport, "run", (original: any) => {
          return this._createWrapForNormalFunction("cds.context.run", original, { root: true });
        });
        return moduleExport;
      },
      moduleExport => {
        this._unwrap(moduleExport, "spawn");
      }
    );
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
                    eventListener.name ?? LABELS.ANTONYMOUS_FUNC
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
                        eventListener.name ?? LABELS.ANTONYMOUS_FUNC
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
