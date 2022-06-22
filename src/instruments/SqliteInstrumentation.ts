/* eslint-disable max-len */
/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/no-this-alias */
import { SpanKind } from "@opentelemetry/api";
import {
  InstrumentationConfig,
  InstrumentationModuleDefinition,
  InstrumentationNodeModuleDefinition
} from "@opentelemetry/instrumentation";
import { DbSystemValues, SemanticAttributes } from "@opentelemetry/semantic-conventions";
import { version } from "../version.json";
import { CDSBaseServiceInstrumentation } from "./CDSBaseInstrumentation";

const SQLITE3_DATABASE_TRACE_FUNCTIONS = ["get", "all", "run", "prepare"];

export class SqliteInstrumentation extends CDSBaseServiceInstrumentation {

  constructor(options: InstrumentationConfig = {}) {
    super("SqliteInstrumentation", version, options);
  }

  private _measureSqliteSpanNameHook(classObject: any, functionName: string) {
    const className = classObject?.name ?? "Unknown";
    this._wrap(classObject.prototype, functionName, (original) => {
      return this._createWrapForCbFunction(
        `${className}.${functionName}`,
        original,
        {
          kind: SpanKind.CLIENT,
          attributes: {
            [SemanticAttributes.DB_SYSTEM]: DbSystemValues.SQLITE,
          }
        },
        {
          startExecutionHook: (span, _thisValue, args) => {
            if (typeof args?.[0] === "string") {
              span.setAttribute(SemanticAttributes.DB_OPERATION, args[0]);
            }
          }
        }
      );
    });
  }

  protected init(): InstrumentationModuleDefinition<any> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      "sqlite3",
      ["5.*"],
      (moduleExport) => {
        for (const sqlite3DatabaseFunction of SQLITE3_DATABASE_TRACE_FUNCTIONS) {
          this._measureSqliteSpanNameHook(moduleExport.Database, sqlite3DatabaseFunction);
        }
        return moduleExport;
      },
      (moduleExport) => {
        for (const sqlite3DatabaseFunction of SQLITE3_DATABASE_TRACE_FUNCTIONS) {
          this._unwrap(moduleExport.Database.prototype, sqlite3DatabaseFunction);
        }
      }
    );

    return module;
  }

}
