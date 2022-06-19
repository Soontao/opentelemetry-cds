/* eslint-disable prefer-rest-params */
import {
  InstrumentationConfig,
  InstrumentationModuleDefinition,
  InstrumentationNodeModuleDefinition
} from "@opentelemetry/instrumentation";
import { version } from "../version.json";
import { CDSBaseServiceInstrumentation } from "./CDSBaseInstrumentation";

/**
 * CDS Compiler Service Instrument
 */
export class CDSCompilerServiceInstrumentation extends CDSBaseServiceInstrumentation {

  constructor(options: InstrumentationConfig = {}) {
    super("CDSBaseServiceInstrumentation", version, options);
  }

  protected init(): InstrumentationModuleDefinition<any> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      "@sap/cds-compiler",
      ["2.*"],
      (moduleExport) => {
        this._wrap(moduleExport, "edm", (original) => {
          
          this._wrap(original, "all", (originalAll) => {
            return function edm(this: any) {
              return originalAll.apply(this, arguments);
            };
          });
          
          return function edm(this: any) {
            return original.apply(this, arguments);
          };
        });
        return moduleExport;
      },
      moduleExport => {
        this._unwrap(moduleExport, "edm");
      }
    );

    return module;
  }
}




