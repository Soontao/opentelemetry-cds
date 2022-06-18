/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable prefer-rest-params */
import {
  InstrumentationConfig,
  InstrumentationModuleDefinition,
  InstrumentationNodeModuleDefinition,
  InstrumentationNodeModuleFile
} from "@opentelemetry/instrumentation";
import { DbSystemValues, SemanticAttributes } from "@opentelemetry/semantic-conventions";
import { CDSSemanticAttributes } from "../attributes";
import { version } from "../version.json";
import { CDSBaseServiceInstrumentation } from "./CDSBaseInstrumentation";

export class CDSServiceInstrumentation extends CDSBaseServiceInstrumentation {

  constructor(options: InstrumentationConfig = {}) {
    super("CDSServiceInstrumentation", version, options);
  }

  protected init(): InstrumentationModuleDefinition<any> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      "@sap/cds",
      ["5.*"]
    );


    module.files.push(new InstrumentationNodeModuleFile<any>(
      "@sap/cds/lib/serve/Service-dispatch.js",
      ["*"],
      /**
       * @param exportedModule 
       */
      (exportedModule) => {
        this._wrap(exportedModule, "dispatch", (original: any) => {
          const inst = this;
          return function dispatch(this: any) {
            const { name, kind } = this;

            const req = arguments[0] ?? {};
            const attributes = {
              [SemanticAttributes.CODE_FILEPATH]: "@sap/cds/lib/serve/Service-dispatch.js",
              [SemanticAttributes.CODE_FUNCTION]: "dispatch",
              [SemanticAttributes.ENDUSER_ID]: req?.user?.id,
              [CDSSemanticAttributes.TENANT_ID]: req?.tenant,
              [CDSSemanticAttributes.CDS_QUERY_ENTITY]: req?.query?.target,
            };

            if (kind === "app-service") {
              attributes[CDSSemanticAttributes.APP_SERVICE_NAME] = name;
            }

            if (name === "db") {
              // if is database service
              attributes[SemanticAttributes.DB_OPERATION] = Object.keys(
                req?.query ?? {}
              )?.[0] ?? req?.method ?? "Unknown";
              switch (kind) {
                case "mysql":
                  attributes[SemanticAttributes.DB_SYSTEM] = DbSystemValues.MYSQL;
                  break;
                case "hana":
                  attributes[SemanticAttributes.DB_SYSTEM] = DbSystemValues.HANADB;
                  break;
                case "sqlite":
                  attributes[SemanticAttributes.DB_SYSTEM] = DbSystemValues.SQLITE;
                  break;
                default:
                  break;
              }
            }

            return inst.runWithNewContext(
              `${kind ?? "unknown kind"} ${name ?? "cds.Service"}.dispatch`,
              () => original.apply(this, arguments),
              { attributes }
            );
          };
        });
        return exportedModule;
      },
      (exportedModule) => {
        this._unwrap(exportedModule.prototype, "run");
      },
    ));

    return module;
  }

}
