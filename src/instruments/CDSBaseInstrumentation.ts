/* eslint-disable max-len */
/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-floating-promises */
import api, { Context, SpanOptions, SpanStatusCode } from "@opentelemetry/api";
import { InstrumentationBase, InstrumentationNodeModuleFile } from "@opentelemetry/instrumentation";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";

export type SpanNameHook = (thisValue: any, args: IArguments) => string;
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
  protected _simpleMeasure(moduleExport: any, moduleName: string, functionName: string, spanNameHook?: SpanNameHook) {
    this._wrap(moduleExport, functionName, (original) => {
      const inst = this;
      const redefined = function (this: any) {
        return inst.runWithNewContext(
          spanNameHook?.(this, arguments) ?? `${moduleName}.${functionName}`,
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

  protected _createSimplePatchFile(moduleName: string, functions: Array<string>): InstrumentationNodeModuleFile<any>;

  protected _createSimplePatchFile(moduleName: string, functions: { [key: string]: SpanNameHook }): InstrumentationNodeModuleFile<any>;

  protected _createSimplePatchFile(moduleName: string, functions: any) {
    return new InstrumentationNodeModuleFile<any>(
      moduleName,
      ["*"],
      moduleExport => {
        if (functions instanceof Array) {
          for (const functionName of functions) {
            this._simpleMeasure(moduleExport, moduleName, functionName);
          }
        }
        else {
          for (const [functionName, spanNameHook] of Object.entries(functions)) {
            this._simpleMeasure(moduleExport, moduleName, functionName, spanNameHook as any);
          }
        }


        return moduleExport;
      },
      moduleExport => {
        for (const functionName of functions instanceof Array ? functions : Object.keys(functions)) {
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
