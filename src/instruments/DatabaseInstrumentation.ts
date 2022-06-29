/* eslint-disable max-len */
import { SpanKind } from "@opentelemetry/api";
import {
  InstrumentationConfig,
  InstrumentationModuleDefinition,
  InstrumentationNodeModuleDefinition
} from "@opentelemetry/instrumentation";
import { DbSystemValues, SemanticAttributes } from "@opentelemetry/semantic-conventions";
import { version } from "../version.json";
import { CDSBaseServiceInstrumentation } from "./CDSBaseInstrumentation";

export interface DatabaseInstrumentationConfig extends InstrumentationConfig {
  packageName: string;
  version: Array<string>;
  classExporter: (moduleExport: any) => any;
  functions: Array<string>;
}

export abstract class DatabaseInstrumentation extends CDSBaseServiceInstrumentation {

  protected _config: DatabaseInstrumentationConfig;

  constructor(name: string, options: DatabaseInstrumentationConfig) {
    super(name, version, options);
    this._config = options;
  }

  protected init(): InstrumentationModuleDefinition<any> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      this._config.packageName,
      this._config.version,
      (moduleExport) => {
        for (const functionName of this._config.functions) {
          this._measureDatabaseFunction(this._config?.classExporter?.(moduleExport), functionName);
        }
        return moduleExport;
      },
      (moduleExport) => {
        for (const functionName of this._config.functions) {
          this._unwrap(this._config?.classExporter?.(moduleExport).prototype, functionName);
        }
      }
    );

    return module;
  }

  protected _measureDatabaseFunction(classObject: any, functionName: string) {
    const className = classObject?.name ?? "Unknown";
    this._wrap(classObject?.prototype, functionName, (original) => {
      return this._createWrapForCbFunction(
        `${this._config.packageName} - ${className}.${functionName}`,
        original,
        {
          kind: SpanKind.CLIENT,
          attributes: {
            [SemanticAttributes.DB_SYSTEM]: this._config.packageName === "hdb" ? DbSystemValues.HANADB : DbSystemValues.SQLITE,
          }
        },
        {
          beforeExecutionHook: (span, _thisValue, args) => {
            if (typeof args?.[0] === "string") {
              span.setAttribute(SemanticAttributes.DB_OPERATION, args[0]);
            }
          }
        }
      );
    });
  }



}
