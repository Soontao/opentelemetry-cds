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
 * CDS Startup Instrumentation
 */
export class CDSStartupInstrumentation extends CDSBaseServiceInstrumentation {

  constructor(options: InstrumentationConfig = {}) {
    super("cds-startup", version, options);
  }

  protected init(): InstrumentationModuleDefinition<any> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      "@sap/cds",
      ["6.*", "7.*"],
    );

    module.files.push(
      this._createSimplePatchFile(
        "@sap/cds/bin/cds-serve.js",
        [
          "exec",
        ],
      ),
    );

    return module;
  }


}




