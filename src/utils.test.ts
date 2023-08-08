import { assert, expect, test } from "vitest";
import {
  enumerate,
  zip,
  mergeBalanceMaps,
  batchArray,
  formatBI18ForDisplay,
  formatValuesAsCsv,
} from "./utils";
import { AddressBIMap } from "./types";

test("enumerate", () => {
  expect(enumerate(3)).toEqual([0, 1, 2]);
  expect(enumerate(3, 1)).toEqual([1, 2, 3]);
  expect(enumerate(3, 2)).toEqual([2, 3, 4]);
});

test("zip", () => {
  expect(zip(["a", "b", "c"], [1, 2, 3])).toEqual({ a: 1, b: 2, c: 3 });
  expect(() => zip(["a", "b", "c"], [1, 2])).toThrow(
    "Zip input lengths don't match"
  );
  expect(() => zip(["a", "b"], [1, 2, 3])).toThrow(
    "Zip input lengths don't match"
  );
});

test("mergeBalanceMaps", () => {
  const mapA = {
    "0x00": 1n,
    "0x01": 2n,
  };
  const mapB = {
    "0x00": 3n,
    "0x02": 4n,
  };
  expect(mergeBalanceMaps(mapA, mapB)).toEqual({
    "0x00": 4n,
    "0x01": 2n,
    "0x02": 4n,
  });
});

test("batchArray", () => {
  expect(batchArray([1, 2, 3, 4, 5], 3)).toEqual([
    [1, 2, 3],
    [4, 5],
  ]);
  expect(batchArray([1, 2, 3, 4, 5], 5)).toEqual([[1, 2, 3, 4, 5]]);
  expect(batchArray([1, 2, 3, 4, 5], 6)).toEqual([[1, 2, 3, 4, 5]]);
});

test("formatBI18ForDisplay", () => {
  const BI_1E18 = BigInt(1e18);
  expect(formatBI18ForDisplay(1n * BI_1E18)).toEqual("1");
  expect(formatBI18ForDisplay(1000n * BI_1E18)).toEqual("1,000");
  expect(formatBI18ForDisplay(1234567n * BI_1E18)).toEqual("1,234,567");
});

test("formatValuesAsCsv", () => {
  const data = { "0x00": 3n, "0x01": 2n, "0x02": 1n } as AddressBIMap;
  expect(formatValuesAsCsv(data)).toEqual(
    "address,value\n0x00,3\n0x01,2\n0x02,1"
  );
});
