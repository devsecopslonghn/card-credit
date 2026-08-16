import { masterBankListSchema, masterCardTypeListSchema } from "@card-credit/contracts";

export const parseMasterBankList = (value) => masterBankListSchema.parse(value);
export const parseMasterCardTypeList = (value) => masterCardTypeListSchema.parse(value);
