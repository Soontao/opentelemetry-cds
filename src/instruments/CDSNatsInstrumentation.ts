/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable prefer-rest-params */
import api, { propagation, ROOT_CONTEXT, SpanKind, SpanStatusCode } from "@opentelemetry/api";
import {
  InstrumentationConfig,
  InstrumentationModuleDefinition,
  InstrumentationNodeModuleDefinition
} from "@opentelemetry/instrumentation";
import { version } from "../version.json";
import { CDSBaseServiceInstrumentation } from "./CDSBaseInstrumentation";

const NatsHeadersAccessor = {
  set(carrier: any, key: string, value: string) {
    carrier?.set?.(key, value);
  },
  keys(carrier: any): any {
    return carrier?.keys?.();
  },
  get(carrier: any, key: string): any {
    return carrier?.get?.(key);
  }
};

export class CDSNatsInstrumentation extends CDSBaseServiceInstrumentation {

  constructor(options: InstrumentationConfig = {}) {
    super("CDSNatsInstrumentation", version, options);
  }

  protected init(): InstrumentationModuleDefinition<any> {
    const module = new InstrumentationNodeModuleDefinition<any>(
      "cds-nats",
      ["2.*"],
      moduleExport => {
        const inst = this;
        this._wrap(moduleExport.prototype, "_publish", (original: any) => {
          return inst._createWrapForNormalFunction("nats - message out", original, { kind: SpanKind.CLIENT }, {
            startExecutionHook(span, thisValue, args) {
              const headers = args?.[2];
              if (headers !== undefined) {
                propagation.inject(api.context.active(), headers, NatsHeadersAccessor);
              }
            }
          });


        });
        this._wrap(moduleExport.prototype, "_handleInboundMessage", (original: any) => {
          return function _handleInboundMessage(this: any) {
            const msg = arguments?.[0];
            if (msg !== undefined) {
              const newContext = propagation.extract(
                ROOT_CONTEXT,
                msg.headers,
                NatsHeadersAccessor
              );
              const newSpan = inst.tracer.startSpan(
                "nats - message in",
                {
                  kind: SpanKind.SERVER,
                },
                newContext
              );
              return api.context.with(
                api.trace.setSpan(newContext, newSpan),
                () => original
                  .apply(this, arguments)
                  .catch((error: any) => {
                    newSpan.recordException(error);
                    newSpan.setStatus({ code: SpanStatusCode.ERROR });
                    throw error;
                  })
                  .finally(() => newSpan.end())
              );
            }

            return original.apply(this, arguments);
          };
        });
        return moduleExport;
      },
      moduleExport => {
        this._unwrap(moduleExport.prototype, "_publish");
        this._unwrap(moduleExport.prototype, "_handleInboundMessage");
      }
    );

    return module;
  }


}




