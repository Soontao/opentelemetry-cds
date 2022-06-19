/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-floating-promises */
import api, { Context, SpanOptions, SpanStatusCode } from "@opentelemetry/api";
import { InstrumentationBase, InstrumentationNodeModuleFile } from "@opentelemetry/instrumentation";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";

export abstract class CDSBaseServiceInstrumentation extends InstrumentationBase {

  private getCurrentSpan() {
    return api.trace.getSpan(api.context.active());
  }

  /**
   * create a new context from current span, if no current span, use root context
   * 
   * @returns 
   */
  private createNewContext(): Context {
    const currentSpan = this.getCurrentSpan();
    if (currentSpan !== undefined) {
      return api.trace.setSpan(
        api.context.active(),
        currentSpan
      );
    }
    return (api as any).ROOT_CONTEXT;
  }

  /**
   * create sub span base current context
   *
   * @param newSpanName
   * @param options
   * @returns
   */
  private createSubSpan(newSpanName: string, options?: SpanOptions) {
    return this.tracer.startSpan(newSpanName, options, this.createNewContext());
  }

  /**
   * create a simple measure module function
   * 
   * @param moduleExport 
   * @param moduleName 
   * @param functionName 
   */
  protected _simpleMeasure(moduleExport: any, moduleName: string, functionName: string) {
    this._wrap(moduleExport, functionName, (original) => {
      const inst = this;
      const redefined = function (this: any) {
        return inst.runWithNewContext(
          `${moduleName}.${functionName}`,
          () => original.apply(this, arguments),
          {
            attributes: {
              [SemanticAttributes.CODE_FILEPATH]: moduleName,
              [SemanticAttributes.CODE_FUNCTION]: functionName,
            }
          }
        );
      };
      Object.defineProperty(redefined, "name", { value: functionName });
      return redefined;
    });
  }

  protected _createSimplePatchFile(moduleName: string, functionNames: Array<string>) {
    return new InstrumentationNodeModuleFile<any>(
      moduleName,
      ["*"],
      moduleExport => {
        for (const functionName of functionNames) {
          this._simpleMeasure(moduleExport, moduleName, functionName);
        }
        return moduleExport;
      },
      moduleExport => {
        for (const functionName of functionNames) {
          this._unwrap(moduleExport, functionName);
        }
      }
    );
  }


  protected runWithNewContext<T = any>(
    newSpanName: string,
    fn: (...args: Array<any>) => T,
    options?: SpanOptions
  ): T {
    const newSpan = this.createSubSpan(newSpanName, options);
    return api.context.with(
      api.trace.setSpan(api.context.active(), newSpan),
      () => {
        let r: any;

        try {
          r = fn();
        }
        catch (error) {
          newSpan.recordException(error);
          newSpan.setStatus({ code: SpanStatusCode.ERROR });
          newSpan.end();
          throw error;
        }

        if (r instanceof Promise) {
          return r
            .catch(error => {
              newSpan.recordException(error);
              newSpan.setStatus({ code: SpanStatusCode.ERROR });
              throw error;
            })
            .finally(() => newSpan.end());
        }
        else {
          newSpan.end();
          return r;
        }

      }) as unknown as any;
  }
}
