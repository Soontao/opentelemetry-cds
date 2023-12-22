/* eslint-disable max-len */
/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/no-this-alias */
import { InstrumentationConfig, InstrumentationModuleDefinition, InstrumentationNodeModuleDefinition } from "@opentelemetry/instrumentation";
import { CDSBaseServiceInstrumentation } from "./CDSBaseInstrumentation";
import { version } from "../version.json";

export class SqliteServiceInstrumentation extends CDSBaseServiceInstrumentation {


  constructor(options: InstrumentationConfig = {}) {
    super("SqliteServiceInstrumentation", version, options);
  }

  protected init(): InstrumentationModuleDefinition<any> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      "@sap/cds",
      ["6.*", "7.*"],
    );

    module.files.push(
      this._createSimplePatchFile(
        "@sap/cds/libx/_runtime/sqlite/Service.js",
        ["deploy"],
        moduleExport => moduleExport.prototype
      )
    );

    return module;

  }

}
