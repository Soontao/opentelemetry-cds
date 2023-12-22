#!/usr/bin/env node
process.env.CDS_OTEL_INTERNAL_TEST !== undefined
  ? require("../src/index")
  : require("../lib/index");

require(require.resolve("@sap/cds/bin/cds-serve", {
  paths: [process.cwd()],
})).exec();
