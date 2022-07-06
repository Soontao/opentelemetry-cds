/* eslint-disable max-len */
/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/no-this-alias */
import { InstrumentationConfig } from "@opentelemetry/instrumentation";
import { DatabaseInstrumentation } from "./DatabaseInstrumentation";


export class SqliteInstrumentation extends DatabaseInstrumentation {

  constructor(options: InstrumentationConfig = {}) {
    super(
      "SqliteInstrumentation",
      {
        ...options,
        packageName: "sqlite3",
        version: ["5.*"],
        classExporter: (moduleExport) => moduleExport.Database,
        functions: ["get", "all", "run", "prepare"]
      }
    );
  }

}
