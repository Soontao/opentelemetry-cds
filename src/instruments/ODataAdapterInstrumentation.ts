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
import { CDSSemanticAttributes } from "../attributes";
import { version } from "../version.json";
import { CDSBaseServiceInstrumentation } from "./CDSBaseInstrumentation";

const _odata_v4 = "@sap/cds/libx/_runtime/cds-services/adapter/odata-v4";
const _okra = `${_odata_v4}/okra`;

export class ODataAdapterInstrumentation extends CDSBaseServiceInstrumentation {

  constructor(options: InstrumentationConfig = {}) {
    super("cds-odata", version, options);
  }

  protected init(): InstrumentationModuleDefinition<any> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      "@sap/cds",
      ["7.*"]
    );


    module.files.push(
      this.createPatchForExecuteOpenRequests(),
      this.createPatchForODataExecutor(),
      this.createPatchForService(),
      this.createPatchForCommand("CommandExecutor"),
    );

    return module;
  }

  private createPatchForODataExecutor() {
    const moduleName = `${_okra}/odata-server/batch/BatchedRequestExecutor.js`;
    return new InstrumentationNodeModuleFile<any>(
      moduleName,
      ["6.*", "7.*"],
      /**
       * @param exportedModule 
       */
      (exportedModule) => {
        this._wrap(exportedModule.prototype, "execute", (original: any) => {
          return this._createWrapForNormalFunction(
            "batch.execute - single batch request",
            original,
            {},
            {
              beforeExecutionHook: (span, thisValue) => {
                const plainHttpRequest = thisValue?._request?.getIncomingRequest?.();
                const boundary = thisValue?._batchContext?.getBoundary?.();
                if (plainHttpRequest !== undefined) {
                  span.setAttributes({
                    [SemanticAttributes.HTTP_URL]: decodeURIComponent(plainHttpRequest?.url ?? ""),
                    [SemanticAttributes.HTTP_METHOD]: plainHttpRequest?.method,
                    [CDSSemanticAttributes.CDS_BATCH_MULTIPART_BOUNDARY]: boundary,
                  });
                }
                // TODO: set inner response status code
              }
            }
          );
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
      ["6.*", "7.*"],
      /**
       * @param exportedModule 
       */
      (exportedModule) => {
        this._simpleMeasure(exportedModule.prototype, "BatchProcessor", "process");
        return exportedModule;
      },
      (exportedModule) => {
        this._unwrap(exportedModule.prototype, "process");
      },
    );
  }

  private createPatchForCommand(name: string) {
    return this._createSimplePatchClass(
      `${_okra}/odata-server/invocation/${name}.js`,
      ["execute"]
    );
  }


  private createPatchForService() {
    return new InstrumentationNodeModuleFile<any>(
      `${_okra}/odata-server/core/Service.js`,
      ["7.*"],
      /**
       * @param exportedModule 
       */
      (exportedModule) => {
        this._wrap(exportedModule.prototype, "process", (original: any) => {
          return this._createWrapForNormalFunction(
            "process",
            original,
            {},
            {
              beforeExecutionHook: (span, _thisValue, [req, _res]) => {
                span.updateName(["odata.execute - single request", req.method, req.originalUrl].join(" - "));
              }
            }
          );
        });
        return exportedModule;
      },
      (exportedModule) => {
        this._unwrap(exportedModule.prototype, "process");
      },
    );
  }

}
