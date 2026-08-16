import type { MasterBankDto, MasterCardTypeDto } from "@card-credit/contracts";
import { parseMasterBankList, parseMasterCardTypeList } from "./masterdataCore.mjs";

const parseError = async (response: Response, fallback: string) => {
  try {
    const body = await response.json() as { error?: { message?: string }; message?: string };
    return body.error?.message ?? body.message ?? fallback;
  } catch {
    return fallback;
  }
};

export const fetchMasterBanks = async (): Promise<MasterBankDto[]> => {
  const response = await fetch(`/api/banks?timestamp=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await parseError(response, "Không thể tải danh sách ngân hàng."));
  return parseMasterBankList(await response.json());
};

export const fetchMasterCardTypes = async (): Promise<MasterCardTypeDto[]> => {
  const response = await fetch(`/api/cardtypes?timestamp=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(await parseError(response, "Không thể tải danh sách loại thẻ."));
  return parseMasterCardTypeList(await response.json());
};
