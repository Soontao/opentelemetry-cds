/* eslint-disable @typescript-eslint/no-floating-promises */
import api, { Context, SpanOptions, SpanStatusCode } from "@opentelemetry/api";
import { InstrumentationBase } from "@opentelemetry/instrumentation";

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
