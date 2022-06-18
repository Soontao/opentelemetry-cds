/* eslint-disable @typescript-eslint/no-floating-promises */
import api, { SpanOptions } from "@opentelemetry/api";
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

  protected async runWithNewContext<T = any>(
    newSpanName: string,
    fn: (...args: Array<any>) => T | Promise<T>,
    options?: SpanOptions
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const newSpan = this.createSubSpan(newSpanName, options);
      api.context.with(api.trace.setSpan(api.context.active(), newSpan), () => {
        let r: any;

        try {
          r = fn();
        }
        catch (error) {
          newSpan.end();
          return reject(error);
        }

        if (r instanceof Promise) {
          return r.then(resolve).catch(reject).finally(() => newSpan.end());
        }
        else {
          return newSpan.end();
        }

      });
    });
  }
}
