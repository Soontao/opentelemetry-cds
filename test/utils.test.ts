import { findObjectInRequireCache } from "../src/instruments/utils";
import api from "@opentelemetry/api";

describe("Utils Test Suite", () => {

  it("should support try to find the object by module cache", () => {
    const m = findObjectInRequireCache(api);
    expect(m).not.toBeUndefined();
  });

});
