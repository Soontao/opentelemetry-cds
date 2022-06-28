#!/usr/bin/env node
require("../lib/index");
require(require.resolve("@sap/cds/bin/cds", { paths: [process.cwd()] })).exec();
