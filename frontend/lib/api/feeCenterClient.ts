import { feeCenterRecordListSchema, feePaymentSchema } from "@card-credit/contracts";
import type { FeeCategory as SharedFeeCategory, FeeCenterRecordDto, FeePaymentDto } from "@card-credit/contracts";

export type FeeCategory = SharedFeeCategory;
export type FeeRecord = FeeCenterRecordDto;
type Form = { id?: string; cardId: string; category: FeeCategory; paymentDate: string; amount: number | ""; note: string };
const message = async (response: Response, fallback: string) => { try { const body = await response.json() as { error?: { message?: string } }; return body.error?.message ?? fallback; } catch { return fallback; } };
export const fetchFeeCenter = async (): Promise<FeeRecord[]> => { const response = await fetch("/api/fee-center", { cache: "no-store" }); if (!response.ok) throw new Error(await message(response, "Không thể tải Fee Center.")); const body = await response.json() as { data?: unknown }; return feeCenterRecordListSchema.parse(body.data ?? []) as FeeRecord[]; };
const parseMutationFee = (value: unknown): FeePaymentDto => { const item = value && typeof value === "object" ? value as Record<string, unknown> : {}; return feePaymentSchema.parse({ id: item.id ?? item._id, cardId: item.cardId ?? item.userCardId, category: item.category ?? "ANNUAL_CARD_FEE", paymentDate: item.paymentDate, amount: item.amount, note: item.note ?? "" }) as FeePaymentDto; };
export const saveFeeCenter = async (form: Form): Promise<FeePaymentDto> => { const response = await fetch(`/api/fee-center${form.id ? `/${form.id}` : ""}`, { method: form.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardId: form.cardId, category: form.category, paymentDate: form.paymentDate, amount: Number(form.amount), note: form.note }) }); if (!response.ok) throw new Error(await message(response, "Không thể lưu khoản phí.")); const body = await response.json() as { data?: unknown }; return parseMutationFee(body.data); };
export const deleteFeeCenter = async (id: string) => { const response = await fetch(`/api/fee-center/${id}`, { method: "DELETE" }); if (!response.ok) throw new Error(await message(response, "Không thể xóa khoản phí.")); };
