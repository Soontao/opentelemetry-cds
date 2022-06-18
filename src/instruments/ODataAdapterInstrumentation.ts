/* eslint-disable camelcase */
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

const _odata_v4 = "@sap/cds/libx/_runtime/cds-services/adapter/odata-v4";
const _okra = `${_odata_v4}/okra`;

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
      this.createPatchForExecuteOpenRequests(),
      this.createPatchForODataExecutor(),
      this.createPatchForUtils(),
    );

    return module;
  }

  private createPatchForODataExecutor() {
    return new InstrumentationNodeModuleFile<any>(
      `${_okra}/odata-server/batch/BatchedRequestExecutor.js`,
      ["5.*"],
      /**
       * @param exportedModule 
       */
      (exportedModule) => {
        this._wrap(exportedModule.prototype, "execute", (original: any) => {
          const inst = this;
          return function execute(this: any) {
            const plainHttpRequest = this?._request?.getIncomingRequest?.();
            const spanParts = [
              plainHttpRequest?.method,
              plainHttpRequest?.url,
              "BatchedRequestExecutor.execute"
            ].filter(Boolean);
            return inst.runWithNewContext(
              spanParts.join(" "),
              () => original.apply(this, arguments),
            );
          };
        });
        return exportedModule;
      },
      (exportedModule) => {
        this._unwrap(exportedModule.prototype, "execute");
      },
    );
  }


  private createPatchForExecuteOpenRequests() {
    return new InstrumentationNodeModuleFile<any>(
      `${_okra}/odata-server/batch/BatchProcessor.js`,
      ["5.*"],
      /**
       * @param exportedModule 
       */
      (exportedModule) => {
        this._wrap(exportedModule.prototype, "process", (original: any) => {
          const inst = this;
          return function process(this: any) {
            return inst.runWithNewContext(
              "BatchProcessor.process",
              () => original.apply(this, arguments),
            );
          };
        });
        return exportedModule;
      },
      (exportedModule) => {
        this._unwrap(exportedModule.prototype, "process");
      },
    );
  }

  
  private createPatchForUtils() {
    return new InstrumentationNodeModuleFile<any>(
      `${_odata_v4}/utils/dispatcherUtils.js`,
      ["5.*"],
      /**
       * @param exportedModule 
       */
      (exportedModule) => {
        this._wrap(exportedModule, "createOdataService", (original: any) => {
          const inst = this;
          return function createOdataService(this: any) {
            return inst.runWithNewContext(
              `dispatcherUtils.createOdataService ${arguments?.[0]?.name}`,
              () => original.apply(this, arguments),
            );
          };
        });
        return exportedModule;
      },
      (exportedModule) => {
        this._unwrap(exportedModule, "createOdataService");
      },
    );
  }

}
