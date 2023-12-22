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
    super("cds-compiler", version, options);
  }

  protected init(): InstrumentationModuleDefinition<any> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      "@sap/cds",
      ["6.*", "7.*"],
    );

    module.files.push(
      this._createSimplePatchFile(
        "@sap/cds/lib/compile/cds-compile.js",
        [
          "edm",
          "edmx",
          "json",
          "csn",
        ],
        m => m.to
      ),
    );

    module.files.push(
      this._createSimplePatchFile(
        "@sap/cds/lib/compile/cds-compile.js",
        [
          "nodejs",
          "odata",
          "sql",
          "drafts",
          "lean_drafts",
        ],
        m => m.for
      ),
    );

    return module;
  }


}




