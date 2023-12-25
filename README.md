# OpenTelemetry for CDS

[![npm](https://img.shields.io/npm/v/opentelemetry-cds)](https://www.npmjs.com/package/opentelemetry-cds)
![GitHub top language](https://img.shields.io/github/languages/top/Soontao/opentelemetry-cds)
[![node-test](https://github.com/Soontao/opentelemetry-cds/actions/workflows/nodejs.yml/badge.svg)](https://github.com/Soontao/opentelemetry-cds/actions/workflows/nodejs.yml)

> `OpenTelemetry` support for `CDS nodejs runtime`

## How to use it

> install this package firstly

```bash
npm i -S opentelemetry-cds
```

> start cds runtime with `opentelemetry-cds` module

```json
{
  "scripts": {
    "start": "otlp-cds-serve"
  }
}
```

## Instruments

- [x] EventHandlers
- [x] EventContext/Event/Request
  - [x] register (on/once/before)
  - [x] emit
- [x] OData Adapter
  - [x] `process`
  - [x] `execute`
  - [x] `createOdataService`
- [x] CDS Compiler
  - [x] edm/edmx/edm.all/edmx.all
- [ ] Messaging
  - [x] cds-nats
    - [ ] rfc
  - [ ] cds.MessagingService
- [x] Database
  - [x] sqlite3 (`Database`.`run`/`prepare`/`all`/`get`)
  - [x] hdb `Client`.`exec`/`prepare`/`commit`/`rollback`
- [x] third-party instrumentations
  - [x] net
  - [x] dns
  - [x] mysql
  - [x] http

## Features

- [x] instrumentations
- [ ] cloud foundry support
- [ ] k8s support
- [ ] environment variables
- [x] `otlp-cds-serve` command

## Configuration

> opentelemetry-cds is using `opentelemetry-http` protocol as exporter, just ref [@opentelemetry/exporter-trace-otlp-http](https://www.npmjs.com/package/@opentelemetry/exporter-trace-otlp-http) document to configure it by environment 


```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### Local Setup

> view the trace in a local jaeger server

1. [Download Jaeger Binary for your OS](https://www.jaegertracing.io/download/)
1. Extract it
1. Run it with otlp enabled flag 
1. Start your cds application with `npx otlp-cds-serve`

<!-- access jaeger UI via http://localhost:16686 -->

```bash
./jaeger-all-in-one --collector.otlp.enabled
# windows
# jaeger-all-in-one.exe --collector.otlp.enabled
```

## Screenshots

> batch operations

![](https://res.cloudinary.com/drxgh9gqs/image/upload/q_51/v1655555236/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE_2022-06-18_202702_m9lrg6.png)

> cross service call

![](https://res.cloudinary.com/drxgh9gqs/image/upload/q_47/v1655704522/2022-06-20_13-16-24_zbewp6.png)

> async message broker

![](https://res.cloudinary.com/drxgh9gqs/image/upload/c_scale,h_1570,q_52/v1655986204/2022-06-23_20-09-16_dzvmxb.png)

## [CHANGELOG](./CHANGELOG.md)

## [LICENSE](./LICENSE)

