/* eslint-disable max-len */

import api, { SpanOptions } from "@opentelemetry/api";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";

const tracer = api.trace.getTracer("opentelemetry-cds");

const getCurrentContext = () => api.trace.getSpan(api.context.active());

const createNewContext = () => {
  return api.trace.setSpan(
    api.context.active(),
    getCurrentContext() ?? tracer.startSpan("Unknown")
  );
};

/**
 * create sub span base current context
 *
 * @param newSpanName
 * @param options
 * @returns
 */
const createSubSpan = (newSpanName: string, options?: SpanOptions) => {
  return tracer.startSpan(newSpanName, options, createNewContext());
};

// export const runWithNewContextCb = (newSpanName, fn) => {
//   const newSpan = createSubSpan(newSpanName);
//   api.context.with(api.trace.setSpan(api.context.active(), newSpan), () => fn(newSpan));
// };


export async function runWithNewContext<T = any>(newSpanName: string, fn: (...args: Array<any>) => Promise<T>, options?: SpanOptions ): Promise<T> {
  return new Promise((resolve, reject) => {
    const newSpan = createSubSpan(newSpanName, Object.assign({}, options ?? {}, {
      attributes: {
        [SemanticAttributes.CODE_FUNCTION]: fn.name ?? "Unknown"
      },
    }));
    api.context.with(api.trace.setSpan(api.context.active(), newSpan), () => {
      fn().then(resolve).catch(reject).finally(() => newSpan.end());
    });
  });
}
