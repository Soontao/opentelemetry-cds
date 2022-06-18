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

export class CDSServiceInstrumentation extends CDSBaseServiceInstrumentation {

  constructor(options: InstrumentationConfig = {}) {
    super("CDSServiceInstrumentation", version, options);
  }

  protected init(): InstrumentationModuleDefinition<any> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      "@sap/cds",
      ["5.*"]
    );


    module.files.push(new InstrumentationNodeModuleFile<any>(
      "@sap/cds/lib/serve/Service-dispatch.js",
      ["*"],
      /**
       * @param exportedModule 
       */
      (exportedModule) => {
        this._wrap(exportedModule, "dispatch",  (original: any) => {
          const inst = this;
          return function dispatch(this: any) {
            const { name, kind } = this;
            return inst.runWithNewContext(
              `${kind ?? "unknown kind"} ${name ?? "cds.Service"}.dispatch`,
              () => original.apply(this, arguments)
            );
          };
        });
        return exportedModule;
      },
      (exportedModule) => {
        this._unwrap(exportedModule.prototype, "run");
      },
    ));

    return module;
  }

}
