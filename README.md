# OpenTelemetry for CDS

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


## Screenshots


![](https://res.cloudinary.com/drxgh9gqs/image/upload/c_scale,h_787/v1655555236/%E5%B1%8F%E5%B9%95%E6%88%AA%E5%9B%BE_2022-06-18_202702_m9lrg6.png)


## [LICENSE](./LICENSE)
