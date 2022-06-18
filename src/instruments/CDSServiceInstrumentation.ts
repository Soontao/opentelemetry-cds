/* eslint-disable prefer-rest-params */
import {
  InstrumentationBase,
  InstrumentationConfig,
  InstrumentationModuleDefinition,
  InstrumentationNodeModuleDefinition,
  InstrumentationNodeModuleFile
} from "@opentelemetry/instrumentation";
import { runWithNewContext } from "../utils";
import { version } from "../version.json";

export class CDSServiceInstrumentation extends InstrumentationBase {

  constructor(options: InstrumentationConfig = {}) {
    super("CDSServiceInstrumentation", version, options);
  }

  protected init(): InstrumentationModuleDefinition<any> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      "@sap/cds",
      ["5.*"]
    );


    module.files.push(new InstrumentationNodeModuleFile<any>(
      "@sap/cds/lib/serve/Service-api.js",
      ["*"],
      (exportedModule) => {
        this._wrap(exportedModule.prototype, "run", function (originalRun: any) {
          return function run(this: any) {
            const { name } = this;
            return runWithNewContext(
              `${name}.run`,
              () => originalRun.apply(this, arguments)
            );
          };
        });
      },
      (exportedModule) => {
        this._unwrap(exportedModule.prototype, "run");
      },
    ));

    return module;
  }

}
