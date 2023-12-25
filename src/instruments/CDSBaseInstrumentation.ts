/* eslint-disable max-len */
/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-floating-promises */
import api, { Context, Span, SpanOptions, SpanStatusCode, ROOT_CONTEXT } from "@opentelemetry/api";
import { InstrumentationBase, InstrumentationNodeModuleFile } from "@opentelemetry/instrumentation";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";

export type SpanNameHook = (thisValue: any, args: IArguments) => string;
export type Done = (this: any, error?: any) => void;
export type BeforeExecutionHook = (span: Span, thisValue: any, args: IArguments) => void;
export type ExecutionHook = (span: Span, thisValue: any, original: any, args: IArguments) => any;
export type ModuleTransform = (moduleExport: any) => any;

export interface Hooks {
  /**
   * hook which invocated before the original function is invoked
   */
  beforeExecutionHook?: BeforeExecutionHook;

  /**
   * hook used for execute original function
   */
  executionHook?: ExecutionHook;


}

export abstract class CDSBaseServiceInstrumentation extends InstrumentationBase {

  private getCurrentSpan() {
    return api.trace.getSpan(api.context.active());
  }

  /**
   * create a new context from current span, if no current span, use root context
   * 
   * @returns 
   */
  protected createNewContext(): Context {
    const currentSpan = this.getCurrentSpan();
    if (currentSpan !== undefined) {
      return api.trace.setSpan(
        api.context.active(),
        currentSpan
      );
    }
    return ROOT_CONTEXT;
  }

  /**
   * create sub span base current context
   *
   * @param newSpanName
   * @param options
   * @returns
   */
  protected createSubSpan(newSpanName: string, options?: SpanOptions) {
    return this.tracer.startSpan(newSpanName, options, this.createNewContext());
  }

  /**
   * create a simple measure module function
   * 
   * @param moduleExport 
   * @param moduleName used to build span name
   * @param functionName used to build span name
   */
  protected _simpleMeasure(moduleExport: any, moduleName: string, functionName: string, hooks?: Hooks) {

    this._wrap(moduleExport, functionName, (original) => {
      const spanName = `${moduleName} ${functionName}`;
      return this._createWrapForNormalFunction(
        spanName,
        original,
        {
          attributes: {
            [SemanticAttributes.CODE_FILEPATH]: moduleName,
            [SemanticAttributes.CODE_FUNCTION]: functionName,
          }
        },
        hooks
      );
    });
  }

  protected _createSimplePatchFile(
    moduleName: string,
    functions: Array<string>,
    moduleTransform?: ModuleTransform
  ): InstrumentationNodeModuleFile<any>;

  protected _createSimplePatchFile(
    moduleName: string,
    functions: any,
    moduleTransform: ModuleTransform = v => v
  ): InstrumentationNodeModuleFile<any> {
    return new InstrumentationNodeModuleFile<any>(
      moduleName,
      ["*"],
      moduleExport => {
        for (const functionName of functions) {
          this._simpleMeasure(moduleTransform(moduleExport), moduleName, functionName);
        }
        return moduleExport;
      },
      moduleExport => {
        for (const functionName of functions) {
          this._unwrap(moduleTransform(moduleExport), functionName);
        }
      }
    );
  }

  protected _createSimplePatchClass(
    moduleName: string,
    functions: Array<string>,
    moduleTransform: ModuleTransform = v => v.prototype
  ) {
    return this._createSimplePatchFile(moduleName, functions, moduleTransform);
  }

  protected _createWrapForNormalFunction(
    spanName: string,
    original: (...args: Array<any>) => void,
    options?: SpanOptions,
    hooks?: Hooks,
  ) {
    const inst = this;
    const redefined = function (this: any) {
      const newSpan = inst.createSubSpan(spanName, options);
      return api.context.with(
        api.trace.setSpan(api.context.active(), newSpan),
        () => {
          hooks?.beforeExecutionHook?.(newSpan, this, arguments);
          let r: any;
          try {
            if (typeof hooks?.executionHook === "function") {
              r = hooks.executionHook(newSpan, this, original, arguments);
            }
            else {
              r = original.apply(this, arguments as any);
            }
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
    };
    if (original?.name !== undefined) {
      Object.defineProperty(redefined, "name", { value: original.name });
    }
    Object.assign(redefined, original);
    return redefined;
  }

  protected _createWrapForCbFunction(
    spanName: string,
    original: (...args: Array<any>) => void,
    options?: SpanOptions,
    hooks?: Hooks,
  ) {
    const inst = this;
    const redefined = function (this: any) {
      const newSpan = inst.createSubSpan(spanName, options);
      return api.context.with(
        api.trace.setSpan(api.context.active(), newSpan),
        () => {
          hooks?.beforeExecutionHook?.(newSpan, this, arguments);
          function done(error?: any) {
            if (error) {
              newSpan.recordException(error);
              newSpan.setStatus({ code: SpanStatusCode.ERROR });
            }
            newSpan.end();
          }
          const cb = arguments?.[arguments.length - 1];
          if (typeof cb === "function") {
            const newArguments = Array
              .from(arguments)
              .slice(0, arguments.length - 1)
              .concat(function wrapCb(this: any) {
                done?.apply(this, arguments as any);
                cb?.apply(this, arguments);
              });
            if (typeof hooks?.executionHook === "function") {
              return hooks.executionHook(newSpan, this, original, newArguments as any);
            }
            else {
              return original.apply(this, newArguments);
            }

          }
          return original.apply(this, arguments as any);
        }) as unknown as any;
    };
    if (original?.name !== undefined) {
      Object.defineProperty(redefined, "name", { value: original.name });
    }
    return redefined;

  }

}
