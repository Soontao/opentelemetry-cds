/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable prefer-rest-params */
import api, { context, propagation, ROOT_CONTEXT, SpanKind } from "@opentelemetry/api";
import {
  InstrumentationConfig,
  InstrumentationModuleDefinition,
  InstrumentationNodeModuleDefinition
} from "@opentelemetry/instrumentation";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import { version } from "../version.json";
import { CDSBaseServiceInstrumentation } from "./CDSBaseInstrumentation";

const NatsHeadersAccessor = {
  set(carrier: any, key: string, value: string) {
    carrier.set(key, value);
  },
  keys(carrier: any): any {
    return carrier.keys()
  },
  get(carrier: any, key: string): any {
    return carrier.get(key)
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
        const inst = this
        this._wrap(moduleExport.prototype, "_publish", (original: any) => {

          return function _publish(this: any) {
            const headers = arguments?.[2] ?? require("nats")?.headers?.();
            const span = inst.tracer.startSpan("nats - message out")
            const parentContext = api.context.active();
            const messageContext = api.trace.setSpan(parentContext, span);
            propagation.inject(
              messageContext,
              headers,
              NatsHeadersAccessor,
            );
            return api.context.with(messageContext, () => original.apply(this, arguments))
          }

        });
        this._wrap(moduleExport.prototype, "_handleInboundMessage", (original: any) => {
          return function _handleInboundMessage(this: any) {
            const msg = arguments?.[0];
            if (msg !== undefined) {
              const newContext = propagation.extract(
                ROOT_CONTEXT,
                msg.headers,
                NatsHeadersAccessor
              )
              const newSpan = inst.tracer.startSpan(
                "nats - message in",
                {
                  kind: SpanKind.SERVER,
                },
                newContext
              )
              return api.context.with(
                api.trace.setSpan(newContext, newSpan),
                () => original.apply(this, arguments)
              )
            }

            return original.apply(this, arguments);
          };
        });
        return moduleExport
      },
      moduleExport => {
        this._unwrap(moduleExport.prototype, "_publish");
        this._unwrap(moduleExport.prototype, "_handleInboundMessage");
      }
    );

    return module;
  }


}




