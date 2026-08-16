import assert from "node:assert/strict";
import test from "node:test";
import { parseMasterBankList, parseMasterCardTypeList } from "../lib/api/masterdataCore.mjs";

test("masterdata frontend parsers accept canonical safe DTOs", () => {
  assert.deepEqual(parseMasterBankList([{ _id: "bank-1", shortname: "TST", name: "Test", fullname: "Test Bank", logo: "" }]), [{ _id: "bank-1", shortname: "TST", name: "Test", fullname: "Test Bank", logo: "" }]);
  assert.deepEqual(parseMasterCardTypeList([{ _id: "type-1", name: "Visa", logo: "" }]), [{ _id: "type-1", name: "Visa", logo: "" }]);
});

test("masterdata frontend parsers reject persistence and malformed fields", () => {
  assert.throws(() => parseMasterBankList([{ _id: "bank-1", shortname: "TST", name: "Test", fullname: "Test Bank", logo: "", tokenHash: "secret" }]));
  assert.throws(() => parseMasterCardTypeList([{ _id: "", name: "Visa", logo: "" }]));
});
