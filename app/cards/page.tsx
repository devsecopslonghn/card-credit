"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { cardPresets } from "@/lib/cardPresets";

// Các hàm hỗ trợ format hiển thị dữ liệu
const formatCurrency = (amount: number | string) => {
    if (!amount) return "0";
    return Number(amount).toLocaleString("vi-VN");
};

const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "Chưa thiết lập";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
};

export default function CardsPage() {
    const [cards, setCards] = useState<any[]>([]);
    const [banks, setBanks] = useState<any[]>([]);
    const [cardTypes, setCardTypes] = useState<any[]>([]);

    // States quản lý Ghi chú Lịch (Calendar Notes)
    const [calendarNotes, setCalendarNotes] = useState<{ [key: string]: string }>({});
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [selectedDateStr, setSelectedDateStr] = useState("");
    const [noteText, setNoteText] = useState("");

    // States quản lý bộ lọc và Modals hệ thống
    const [selectedOwner, setSelectedOwner] = useState<string>("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedPresetId, setSelectedPresetId] = useState("");
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [cardToDelete, setCardToDelete] = useState<any>(null);

    const [formData, setFormData] = useState({
        bank: "",
        name: "",
        type: "",
        owner: "",
        imageUrl: "",
        annualFee: "",
    });

    // NÂNG CẤP: Chuyển thông tin Tháng/Năm thành State để người dùng tự do lựa chọn
    const todayObj = new Date();
    const [currentYear, setCurrentYear] = useState<number>(todayObj.getFullYear());
    const [currentMonth, setCurrentMonth] = useState<number>(todayObj.getMonth()); // Lưu từ 0 - 11

    // Các biến phụ thuộc tự động tính toán lại mỗi khi State currentYear hoặc currentMonth thay đổi
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0: Chủ nhật, 1: Thứ 2...

    const weekdays = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

    // Tạo danh sách năm từ (Năm hiện tại - 5 năm) đến (Năm hiện tại + 5 năm) để chọn
    const yearOptions = Array.from({ length: 11 }, (_, i) => todayObj.getFullYear() - 5 + i);

    useEffect(() => {
        fetchCards();
        fetchMasterData();
        fetchCalendarNotes();
    }, []);

    const fetchCards = async () => {
        const res = await fetch(`/api/cards?timestamp=${new Date().getTime()}`, { cache: "no-store" });
        const data = await res.json();
        setCards(data);
    };

    const fetchMasterData = async () => {
        try {
            const [banksRes, typesRes] = await Promise.all([
                fetch("/api/banks"),
                fetch("/api/cardtypes"),
            ]);
            setBanks(await banksRes.json());
            setCardTypes(await typesRes.json());
        } catch (error) {
            console.error("Lỗi tải masterdata", error);
        }
    };

    const fetchCalendarNotes = async () => {
        try {
            const res = await fetch(`/api/notes?timestamp=${new Date().getTime()}`, { cache: "no-store" });
            const data = await res.json();
            const notesObj: { [key: string]: string } = {};
            data.forEach((n: any) => { notesObj[n.date] = n.content; });
            setCalendarNotes(notesObj);
        } catch (error) {
            console.error("Lỗi tải ghi chú lịch", error);
        }
    };

    const showToast = (message: string, type: "success" | "error" = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleDayClick = (dayNumber: number) => {
        const paddedMonth = String(currentMonth + 1).padStart(2, '0');
        const paddedDay = String(dayNumber).padStart(2, '0');
        const dateKey = `${currentYear}-${paddedMonth}-${paddedDay}`;

        setSelectedDateStr(dateKey);
        setNoteText(calendarNotes[dateKey] || "");
        setIsNoteModalOpen(true);
    };

    const handleSaveNote = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const res = await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date: selectedDateStr, content: noteText }),
        });

        setIsSubmitting(false);
        if (!res.ok) {
            showToast("Lỗi không thể lưu ghi chú!", "error");
            return;
        }

        setCalendarNotes({ ...calendarNotes, [selectedDateStr]: noteText });
        setIsNoteModalOpen(false);
        showToast("Đã lưu ghi chú lịch thành công!", "success");
    };

    const handleTogglePaid = async (isChecked: boolean, card: any) => {
        const updatedCard = { ...card, isPaidThisMonth: isChecked };
        setCards(cards.map(c => c._id === card._id ? updatedCard : c));
        const res = await fetch(`/api/cards/${card._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedCard),
        });
        if (res.ok) {
            showToast(isChecked ? "Đã đánh dấu thanh toán xong!" : "Đã hủy đánh dấu thanh toán!", "success");
        } else {
            showToast("Lỗi khi cập nhật trạng thái!", "error");
        }
    };

    const openCreateModal = () => {
        setEditingId(null);
        setSelectedPresetId("");
        setFormData({ bank: "", name: "", type: "", owner: "Tôi", imageUrl: "", annualFee: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (card: any) => {
        setEditingId(card._id);
        setSelectedPresetId("");
        setFormData({ bank: card.bank, name: card.name, type: card.type, owner: card.owner || "Tôi", imageUrl: card.imageUrl, annualFee: card.annualFee.toString() });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => { setEditingId(null); setSelectedPresetId(""); setFormData({ bank: "", name: "", type: "", owner: "", imageUrl: "", annualFee: "" }); }, 200);
    };

    const handlePresetChange = (presetId: string) => {
        setSelectedPresetId(presetId);
        const preset = cardPresets.find((item) => item.id === presetId);

        if (!preset) return;

        setFormData({
            ...formData,
            bank: preset.bank,
            name: preset.name,
            type: preset.type,
            imageUrl: preset.imageUrl,
            annualFee: preset.annualFee.toString(),
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.bank || !formData.type) {
            showToast("Vui lòng chọn Ngân hàng và Loại thẻ từ danh sách!", "error");
            return;
        }
        setIsSubmitting(true);
        const url = editingId ? `/api/cards/${editingId}` : "/api/cards";
        const method = editingId ? "PUT" : "POST";
        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...formData, owner: formData.owner.trim() || "Tôi", annualFee: Number(formData.annualFee) }),
        });
        setIsSubmitting(false);
        if (!res.ok) { showToast("Có lỗi xảy ra khi lưu!", "error"); return; }
        closeModal(); fetchCards(); showToast(editingId ? "Cập nhật thẻ thành công!" : "Đã thêm thẻ mới!", "success");
    };

    const confirmDelete = (card: any) => {
        setCardToDelete(card);
    };

    const executeDelete = async () => {
        if (!cardToDelete) return;
        await fetch(`/api/cards/${cardToDelete._id}`, { method: "DELETE" });
        fetchCards(); setCardToDelete(null); showToast("Đã xóa thẻ khỏi hệ thống!", "success");
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                showToast("Kích thước ảnh quá lớn! Vui lòng chọn ảnh dưới 2MB.", "error");
                e.target.value = "";
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, imageUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const uniqueOwners = Array.from(new Set(cards.map(c => c.owner?.trim()).filter(Boolean)));
    const bankOptions = Array.from(
        new Set([...banks.map((bank) => bank.shortname), ...cardPresets.map((preset) => preset.bank)]),
    ).sort();
    const cardTypeOptions = Array.from(
        new Set([...cardTypes.map((cardType) => cardType.name), ...cardPresets.map((preset) => preset.type)]),
    ).sort();
    const filteredCards = selectedOwner ? cards.filter(c => c.owner?.trim() === selectedOwner) : cards;
    const upcomingPayments = filteredCards.filter(c => c.paymentDueDate && !c.isPaidThisMonth)
        .sort((a, b) => new Date(a.paymentDueDate).getTime() - new Date(b.paymentDueDate).getTime());

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 md:px-8 relative">
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-white font-medium transition-all duration-300 transform ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>
                    <span className="text-lg">{toast.type === "success" ? "✓" : "✕"}</span>
                    {toast.message}
                </div>
            )}

            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Thẻ Tín Dụng</h1>
                        <p className="text-gray-500 mt-1">Số lượng thẻ hiển thị: {filteredCards?.length} / {cards?.length}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Thẻ của:</label>
                            <select className="p-2.5 bg-gray-50 text-gray-900 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm cursor-pointer min-w-[160px]"
                                value={selectedOwner} onChange={(e) => setSelectedOwner(e.target.value)}>
                                <option value="">Tất cả thành viên</option>
                                {uniqueOwners.map((ownerStr, idx) => <option key={idx} value={ownerStr}>{ownerStr}</option>)}
                            </select>
                        </div>
                        <a href="/api/reports/summary" target="_blank" rel="noopener noreferrer" className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 px-5 py-2.5 rounded-xl font-medium shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center text-sm">
                            Xuất JSON
                        </a>
                        <button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center text-sm">
                            Thêm thẻ mới
                        </button>
                    </div>
                </div>

                {/* KHU VỰC 1: LỊCH CALENDAR GHI CHÚ (ĐÃ THAY ĐỔI Ô CHỌN THÁNG/NĂM BẤT KỲ) */}
                <div className="mb-8 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-gray-100 pb-4">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            📅 Lịch Ghi Chú Chi Tiêu & Nhắc Hạn
                        </h2>

                        {/* Cụm điều khiển chọn Tháng và Năm bất kỳ */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <select
                                className="p-2 bg-gray-50 border border-gray-300 text-gray-900 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-sm cursor-pointer"
                                value={currentMonth}
                                onChange={(e) => setCurrentMonth(Number(e.target.value))}
                            >
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i} value={i}>Tháng {i + 1}</option>
                                ))}
                            </select>

                            <select
                                className="p-2 bg-gray-50 border border-gray-300 text-gray-900 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-sm cursor-pointer"
                                value={currentYear}
                                onChange={(e) => setCurrentYear(Number(e.target.value))}
                            >
                                {yearOptions.map((year) => (
                                    <option key={year} value={year}>Năm {year}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Hàng hiển thị Thứ */}
                    <div className="grid grid-cols-7 gap-2 text-center mb-1 text-xs font-bold text-gray-400">
                        {weekdays.map((day, idx) => (
                            <div key={idx} className={idx === 0 ? "text-red-400" : ""}>{day}</div>
                        ))}
                    </div>

                    {/* Lưới các ô Ngày trong tháng */}
                    <div className="grid grid-cols-7 gap-2">
                        {/* Tạo các ô trống thụt lề đầu tháng */}
                        {Array(firstDayIndex).fill(null).map((_, idx) => (
                            <div key={`empty-${idx}`} className="min-h-[6rem] bg-gray-50/50 rounded-xl border border-dashed border-gray-200/60"></div>
                        ))}

                        {/* Vòng lặp vẽ số ngày thực tế */}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNumber) => {
                            const pMonth = String(currentMonth + 1).padStart(2, '0');
                            const pDay = String(dayNumber).padStart(2, '0');
                            const dateKey = `${currentYear}-${pMonth}-${pDay}`;
                            const hasNote = !!calendarNotes[dateKey];

                            const isToday = todayObj.getDate() === dayNumber &&
                                todayObj.getMonth() === currentMonth &&
                                todayObj.getFullYear() === currentYear;

                            return (
                                <div
                                    key={dayNumber}
                                    onClick={() => handleDayClick(dayNumber)}
                                    // Đổi h-24 thành min-h-[6rem] và đổi justify-between thành justify-start
                                    className={`min-h-[6rem] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-start group relative overflow-hidden text-left
                                        ${isToday ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300' : 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-sm'}
                                    `}
                                >
                                    <span className={`text-sm font-bold ${isToday ? 'text-blue-600' : 'text-gray-700 group-hover:text-blue-600'}`}>
                                        {dayNumber}
                                    </span>

                                    {hasNote ? (
                                        // Bỏ line-clamp-2, thêm whitespace-pre-wrap để giữ nguyên định dạng xuống dòng của người dùng
                                        <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 p-1.5 rounded font-medium mt-1.5 leading-relaxed w-full whitespace-pre-wrap break-words">
                                            {calendarNotes[dateKey]}
                                        </p>
                                    ) : (
                                        // Đẩy chữ Thêm note xuống đáy ô
                                        <span className="text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity mt-auto self-end pt-2">
                                            + Thêm note
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* KHU VỰC LỊCH NHẮC NỢ THEO THẺ */}
                {upcomingPayments.length > 0 && (
                    <div className="mb-8 bg-orange-50 border border-orange-200 rounded-2xl p-5 shadow-sm">
                        <h2 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                            ⚠️ Danh sách thẻ sắp đến hạn {selectedOwner && `của [${selectedOwner}]`}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {upcomingPayments.map(card => (
                                <div key={card._id} className="bg-white p-4 rounded-xl border border-orange-100 flex justify-between items-center shadow-sm">
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm line-clamp-1">{card.name}</p>
                                        <div className="flex gap-2 items-center mt-0.5">
                                            <span className="text-xs text-gray-500">{card.bank}</span>
                                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">Thẻ: {card.owner || "Tôi"}</span>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                        <p className="font-bold text-red-600">{formatDateDisplay(card.paymentDueDate)}</p>
                                        <p className="text-xs font-bold text-gray-900">{formatCurrency(card.amountDueThisMonth)} ₫</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* GRID DANH SÁCH THẺ TÍN DỤNG */}
                {filteredCards.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                        <p className="text-gray-500">Không có thẻ nào phù hợp với bộ lọc hiện tại.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCards.map((card) => (
                            <Link href={`/cards/${card._id}`} key={card._id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 block relative">
                                <div className="h-48 overflow-hidden bg-gray-100 relative">
                                    <img src={card.imageUrl} alt={card.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-xs font-bold px-3 py-1 rounded-full shadow-sm text-gray-700">
                                        {card.type}
                                    </div>
                                </div>
                                <div className="p-5">
                                    <div className="mb-2">
                                        <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-md border border-blue-100 inline-block">
                                            👤 Thẻ của: {card.owner || "Tôi"}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-500 mb-1">{card.bank}</p>
                                    <h3 className="font-bold text-medium text-gray-900 mb-3 line-clamp-1">{card.name}</h3>
                                    <div className="flex flex-col border-t border-gray-100 pt-4 mt-2 gap-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Hạn thanh toán:</span>
                                            <span className="font-bold text-red-500">{formatDateDisplay(card.paymentDueDate)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Tiền cần thanh toán:</span>
                                            <span className="font-bold text-gray-900">{formatCurrency(card.amountDueThisMonth)} ₫</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2 border-t border-gray-50 pt-3">
                                            <label className="flex items-center gap-2 cursor-pointer z-10" onClick={(e) => e.stopPropagation()}>
                                                <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                                    checked={card.isPaidThisMonth || false}
                                                    onChange={(e) => handleTogglePaid(e.target.checked, card)} />
                                                <span className={`text-xs font-bold ${card.isPaidThisMonth ? 'text-emerald-600 line-through' : 'text-gray-500'}`}>Đã thanh toán</span>
                                            </label>
                                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={(e) => { e.preventDefault(); openEditModal(card); }} className="text-gray-400 hover:text-blue-600 p-2 rounded-md hover:bg-blue-50" title="Sửa"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                                <button onClick={(e) => { e.preventDefault(); confirmDelete(card); }} className="text-gray-400 hover:text-red-600 p-2 rounded-md hover:bg-red-50" title="Xóa"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* MODAL THÊM/SỬA GHI CHÚ LỊCH */}
                {isNoteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-lg font-bold text-gray-900">Ghi chú Ngày {formatDateDisplay(selectedDateStr)}</h3>
                                <button onClick={() => setIsNoteModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                            </div>
                            <form onSubmit={handleSaveNote} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Nội dung ghi chú</label>
                                    <textarea
                                        rows={4}
                                        placeholder="Nhập note chi tiêu, nhắc nhở hoặc nhật ký quẹt thẻ... (Để trống để xóa note)"
                                        className="w-full p-3 bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                                        value={noteText}
                                        onChange={(e) => setNoteText(e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => setIsNoteModalOpen(false)} className="px-5 py-2.5 text-gray-900 font-medium hover:bg-gray-100 rounded-lg">Hủy</button>
                                    <button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium">
                                        {isSubmitting ? "Đang lưu..." : "Lưu ghi chú"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL THÊM / SỬA THẺ TÍN DỤNG */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="text-lg font-bold text-gray-900">{editingId ? "Cập nhật thẻ" : "Thêm thẻ mới"}</h3>
                                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">✕</button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Mẫu thẻ có sẵn</label>
                                    <select className="w-full p-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        value={selectedPresetId} onChange={(e) => handlePresetChange(e.target.value)}>
                                        <option value="">Tự nhập hoặc chọn mẫu thẻ</option>
                                        {cardPresets.map((preset) => (
                                            <option key={preset.id} value={preset.id}>
                                                {preset.bank} - {preset.name} ({preset.type})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-1">Ngân hàng</label>
                                        <select required className="w-full p-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.bank} onChange={(e) => setFormData({ ...formData, bank: e.target.value })} >
                                            <option value="" disabled>Chọn ngân hàng</option>
                                            {bankOptions.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-1">Loại thẻ</label>
                                        <select required className="w-full p-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                                            <option value="" disabled>Chọn loại thẻ</option>
                                            {cardTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Chủ sở hữu thẻ</label>
                                    <input required placeholder="Tôi, Mẹ, Anh Hai..." className="w-full p-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                        value={formData.owner} onChange={(e) => setFormData({ ...formData, owner: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Tên thẻ</label>
                                    <input required placeholder="VD: StepUP Cashback" className="w-full p-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Phí thường niên (VNĐ)</label>
                                    <input required type="number" placeholder="VD: 500000" className="w-full p-2.5 bg-white text-gray-900 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.annualFee} onChange={(e) => setFormData({ ...formData, annualFee: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Hình ảnh thẻ</label>
                                    <div className="flex items-center gap-4">
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white cursor-pointer" />
                                        {formData.imageUrl && <img src={formData.imageUrl} alt="Preview" className="w-24 h-14 object-contain rounded-md border bg-gray-50" />}
                                    </div>
                                    {selectedPresetId && <p className="text-xs text-gray-500 mt-1">Đang dùng ảnh từ mẫu thẻ. Bạn vẫn có thể upload ảnh khác để thay thế.</p>}
                                </div>
                                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                                    <button type="button" onClick={closeModal} className="px-5 py-2.5 text-gray-900 font-medium hover:bg-gray-100 rounded-lg">Hủy bỏ</button>
                                    <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2">
                                        {isSubmitting ? "Đang xử lý..." : editingId ? "Cập nhật" : "Lưu thẻ"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL XÁC NHẬN XÓA THẺ */}
                {cardToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center transform transition-all">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-red-600 text-2xl font-bold">⚠️</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Xác nhận xóa thẻ?</h3>
                            <p className="text-gray-500 mb-6 text-sm">Bạn có chắc chắn muốn xóa thẻ <strong>{cardToDelete.name}</strong> không?</p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setCardToDelete(null)} className="px-5 py-2.5 text-gray-700 bg-gray-100 rounded-lg w-full">Hủy bỏ</button>
                                <button onClick={executeDelete} className="px-5 py-2.5 text-white bg-red-600 rounded-lg w-full">Đồng ý xóa</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
