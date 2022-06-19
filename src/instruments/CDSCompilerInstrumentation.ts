/* eslint-disable @typescript-eslint/no-this-alias */
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
    );

    module.files.push(
      this._createSimplePatchFile(
        "@sap/cds-compiler/lib/backends.js",
        [
          "preparedCsnToEdm",
          "preparedCsnToEdmAll",
          "preparedCsnToEdmx",
          "preparedCsnToEdmxAll",
        ]
      )
    );

    return module;
  }


}




