#!/usr/bin/env node
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

if (!fs.existsSync(path.join(__dirname, "./node_modules/@sap/cds"))) {
  console.log("Installing no trace dependencies ...");
  const VERSION = '^7'
  const deps = [
    `@sap/cds@${VERSION}`, 'axios', 'express', `sqlite3`
  ];

  const p = spawn(
    `npm i --no-save ${deps.join(" ")}`,
    {
      shell: true
    }
  );
  p.stdout.pipe(process.stdout);
  p.stderr.pipe(process.stderr);
  p.on("error", console.error);
  p.on("exit", () => console.log("done"));
}
