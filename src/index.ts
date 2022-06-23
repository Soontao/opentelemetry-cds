
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { DnsInstrumentation } from "@opentelemetry/instrumentation-dns";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { GenericPoolInstrumentation } from "@opentelemetry/instrumentation-generic-pool";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { MySQL2Instrumentation } from "@opentelemetry/instrumentation-mysql2";
import { NetInstrumentation } from "@opentelemetry/instrumentation-net";
import { Resource } from "@opentelemetry/resources";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import os from "os";
import path from "path";
import process from "process";
import { CDSCompilerServiceInstrumentation } from "./instruments/CDSCompilerInstrumentation";
import { CDSNatsInstrumentation } from "./instruments/CDSNatsInstrumentation";
import { CDSServiceInstrumentation } from "./instruments/CDSServiceInstrumentation";
import { HanaInstrumentation } from "./instruments/HanaInstrumentation";
import { ODataAdapterInstrumentation } from "./instruments/ODataAdapterInstrumentation";
import { SqliteInstrumentation } from "./instruments/SqliteInstrumentation";

const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.SERVICE_NAME ?? path.basename(process.cwd()),
    [SemanticResourceAttributes.PROCESS_PID]: process.pid,
    [SemanticResourceAttributes.HOST_ARCH]: os.arch(),
    [SemanticResourceAttributes.HOST_NAME]: os.hostname(),
  }),
});

const exporter = new OTLPTraceExporter();

provider.addSpanProcessor(new BatchSpanProcessor(exporter));

provider.register();

registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new CDSServiceInstrumentation(),
    new CDSCompilerServiceInstrumentation(),
    new ODataAdapterInstrumentation(),
    new GenericPoolInstrumentation(),
    new NetInstrumentation(),
    new DnsInstrumentation(),
    new MySQL2Instrumentation(),
    new SqliteInstrumentation(),
    new HanaInstrumentation(),
    new CDSNatsInstrumentation(),
  ],
});


["SIGINT", "SIGTERM"].forEach(signal => {
  process.on(signal, () => provider.shutdown().catch(console.error));
});
