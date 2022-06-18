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

export class ODataAdapterInstrumentation extends CDSBaseServiceInstrumentation {

  constructor(options: InstrumentationConfig = {}) {
    super("ODataAdapterInstrumentation", version, options);
  }

  protected init(): InstrumentationModuleDefinition<any> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      "@sap/cds",
      ["5.*"]
    );


    module.files.push(
      this.createPatchForServiceDispatch(),

    );

    return module;
  }

  private createPatchForServiceDispatch() {
    return new InstrumentationNodeModuleFile<any>(
      "@sap/cds/libx/_runtime/cds-services/adapter/odata-v4/okra/odata-server/batch/BatchProcessor.js",
      ["5.*"],
      /**
       * @param exportedModule 
       */
      (exportedModule) => {
        this._wrap(exportedModule.prototype, "_executeOpenRequests", (original: any) => {
          const inst = this;
          return function _executeOpenRequests(this: any) {
            return inst.runWithNewContext(
              "BatchProcessor._executeOpenRequests",
              () => original.apply(this, arguments),
            );
          };
        });
        return exportedModule;
      },
      (exportedModule) => {
        this._unwrap(exportedModule.prototype, "_executeOpenRequests",);
      },
    );
  }

}
