/* eslint-disable max-len */
/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/no-this-alias */
import { InstrumentationConfig } from "@opentelemetry/instrumentation";
import { DatabaseInstrumentation } from "./DatabaseInstrumentation";

export class HanaInstrumentation extends DatabaseInstrumentation {

  constructor(options: InstrumentationConfig = {}) {
    super(
      "cds-hana",
      {
        ...options,
        packageName: "hdb",
        version: ["0.*"],
        classExporter: (moduleExport) => moduleExport.Client,
        functions: ["exec", "prepare", "commit", "rollback"]
      }
    );
  }

}
