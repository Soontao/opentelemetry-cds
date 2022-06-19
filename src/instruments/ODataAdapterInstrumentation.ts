/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable prefer-rest-params */
import {
  InstrumentationConfig,
  InstrumentationModuleDefinition,
  InstrumentationNodeModuleDefinition,
  InstrumentationNodeModuleFile
} from "@opentelemetry/instrumentation";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
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
    const moduleName = `${_okra}/odata-server/batch/BatchedRequestExecutor.js`;
    return new InstrumentationNodeModuleFile<any>(
      moduleName,
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
              "batch.execute",
              plainHttpRequest?.method,
              plainHttpRequest?.url,
            ].filter(Boolean);
            return inst.runWithNewContext(
              spanParts.join(" "),
              () => original.apply(this, arguments),
              {
                attributes: {
                  [SemanticAttributes.CODE_FILEPATH]: moduleName,
                  [SemanticAttributes.CODE_FUNCTION]: "execute"
                }
              }
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
    const moduleName = `${_okra}/odata-server/batch/BatchProcessor.js`;
    return new InstrumentationNodeModuleFile<any>(
      moduleName,
      ["5.*"],
      /**
       * @param exportedModule 
       */
      (exportedModule) => {
        this._simpleMeasure(exportedModule.prototype, moduleName, "process");
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
              `createOdataService for '${arguments?.[0]?.name}'`,
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
