import type { MasterBankDto, MasterCardTypeDto } from "@card-credit/contracts";
import type { MasterdataRepository, MasterRecord } from "../masterdata.js";
import type { ServiceContext } from "./types/service-context.js";

const stringValue = (value: unknown) => typeof value === "string" ? value : "";
const idValue = (value: unknown) => String(value ?? "").trim();

const bankDto = (record: MasterRecord): MasterBankDto => ({
  _id: idValue(record._id),
  shortname: stringValue(record.shortname),
  name: stringValue(record.name),
  fullname: stringValue(record.fullname),
  logo: stringValue(record.logo),
});

const cardTypeDto = (record: MasterRecord): MasterCardTypeDto => ({
  _id: idValue(record._id),
  name: stringValue(record.name),
  logo: stringValue(record.logo),
});

export class MasterdataQueryService {
  static async listBanks(_ctx: ServiceContext, repository: MasterdataRepository): Promise<MasterBankDto[]> {
    const records = await repository.list("banks", "shortname");
    return records.map(bankDto);
  }

  static async listCardTypes(_ctx: ServiceContext, repository: MasterdataRepository): Promise<MasterCardTypeDto[]> {
    const records = await repository.list("cardtypes", "name");
    return records.map(cardTypeDto);
  }
}
