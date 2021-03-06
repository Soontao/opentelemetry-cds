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
    super("ODataAdapterInstrumentation", version, options);
  }

  protected init(): InstrumentationModuleDefinition<any> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      "@sap/cds",
      ["5.*", "6.*"]
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
      ["5.*", "6.*"],
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
      ["5.*", "6.*"],
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


  private createPatchForUtils() {
    return new InstrumentationNodeModuleFile<any>(
      `${_odata_v4}/utils/dispatcherUtils.js`,
      ["5.*", "6.*"],
      /**
       * @param exportedModule 
       */
      (exportedModule) => {
        this._wrap(exportedModule, "createOdataService", (original: any) => {
          return this._createWrapForNormalFunction(
            "createOdataService",
            original,
            {},
            {
              beforeExecutionHook: (span, _thisValue, args) => {
                span.setAttribute(CDSSemanticAttributes.CDS_APP_SERVICE_NAME, args?.[0]?.name);
              }
            }
          );
        });
        return exportedModule;
      },
      (exportedModule) => {
        this._unwrap(exportedModule, "createOdataService");
      },
    );
  }

}
