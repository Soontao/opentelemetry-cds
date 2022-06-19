# OpenTelemetry for CDS

> `OpenTelemetry` support for `CDS nodejs runtime`

![GitHub top language](https://img.shields.io/github/languages/top/Soontao/opentelemetry-cds)
[![node-test](https://github.com/Soontao/opentelemetry-cds/actions/workflows/nodejs.yml/badge.svg)](https://github.com/Soontao/opentelemetry-cds/actions/workflows/nodejs.yml)

## How to use it

> install this package firstly

```bash
npm i -S opentelemetry-cds
```

> start cds runtime with `opentelemetry-cds` module

```json
{
  "scripts": {
    "start": "node -r opentelemetry-cds ./node_modules/.bin/cds run"
  }
}
```

## Instruments

- [x] Service-dispatch
- [x] OData Adapter
  - [x] BatchProcessor.process
  - [x] BatchedRequestExecutor.execute
  - [x] dispatcherUtils.createOdataService
- [x] CDS Compiler
  - [x] edm/edmx/edm.all/edmx.all


## OTLP Endpoint

> opentelemetry-cds is using `opentelemetry-http` protocol as exporter, just ref [@opentelemetry/exporter-trace-otlp-http](https://www.npmjs.com/package/@opentelemetry/exporter-trace-otlp-http) document to configure it by environment 


```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://localhost:4318
```

## Screenshots


![](https://res.cloudinary.com/drxgh9gqs/image/upload/v1655633158/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE_2022-06-19_180449_qxy01p.png)


## [LICENSE](./LICENSE)
