/* eslint-disable @typescript-eslint/no-floating-promises */
import api, { SpanOptions, SpanStatusCode } from "@opentelemetry/api";
import { InstrumentationBase } from "@opentelemetry/instrumentation";

export abstract class CDSBaseServiceInstrumentation extends InstrumentationBase {

  private getCurrentContext() {
    return api.trace.getSpan(api.context.active()) ?? this.tracer.startSpan("Unknown");
  }

  private createNewContext() {
    return api.trace.setSpan(
      api.context.active(),
      this.getCurrentContext()
    );
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
