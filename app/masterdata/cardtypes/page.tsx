"use client";
import { useCallback, useEffect, useState } from "react";
import { MasterdataLogoImage } from "@/components/MasterdataLogoImage";

type CardType = {
  _id: string;
  name: string;
  logo: string;
};

type ApiMessage = {
  message?: string;
};

const fetchCardTypesData = async () => {
  const res = await fetch(`/api/cardtypes?timestamp=${new Date().getTime()}`, {
    cache: "no-store",
  });
  return (await res.json()) as CardType[];
};

export default function CardTypeMasterdataPage() {
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    logo: "",
  });

  const refreshCardTypes = useCallback(async () => {
    setCardTypes(await fetchCardTypesData());
  }, []);

  useEffect(() => {
    let active = true;
    void fetchCardTypesData().then((data) => {
      if (active) setCardTypes(data);
    });
    return () => {
      active = false;
    };
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ name: "", logo: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (cardType: CardType) => {
    setEditingId(cardType._id);
    setFormData({
      name: cardType.name,
      logo: cardType.logo,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setEditingId(null);
      setFormData({ name: "", logo: "" });
    }, 200);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Kích thước logo quá lớn! Vui lòng chọn ảnh dưới 2MB.");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.logo) {
      alert("Vui lòng tải lên logo cho loại thẻ này!");
      return;
    }
    
    setIsSubmitting(true);
    const url = editingId ? `/api/cardtypes/${editingId}` : "/api/cardtypes";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const result = (await res.json()) as ApiMessage;
    setIsSubmitting(false);

    if (!res.ok) {
      alert(result.message);
      return;
    }

    closeModal();
    void refreshCardTypes();
  };

  const handleDelete = async (id: string) => {
    if (confirm("CẢNH BÁO: Bạn có chắc chắn muốn xóa loại thẻ này?")) {
      await fetch(`/api/cardtypes/${id}`, { method: "DELETE" });
      void refreshCardTypes();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Masterdata: Loại Thẻ</h1>
            <p className="text-gray-500 mt-1">Quản lý danh mục các tổ chức phát hành thẻ (Visa, JCB...)</p>
          </div>
          <button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Thêm Loại Thẻ
          </button>
        </div>

        {/* Bảng dữ liệu Loại Thẻ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm font-semibold">
                  <th className="p-4 w-32 text-center">Logo</th>
                  <th className="p-4">Tên Loại Thẻ</th>
                  <th className="p-4 w-32 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {cardTypes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-gray-500">
                      Chưa có loại thẻ nào trong cơ sở dữ liệu.
                    </td>
                  </tr>
                ) : (
                  cardTypes.map((cardType) => (
                    <tr key={cardType._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <div className="w-16 h-10 bg-white border border-gray-200 rounded flex items-center justify-center p-1 overflow-hidden mx-auto">
                          <MasterdataLogoImage src={cardType.logo} alt={cardType.name} fallbackLabel={cardType.name} />
                        </div>
                      </td>
                      <td className="p-4 font-bold text-gray-900 text-lg">{cardType.name}</td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => openEditModal(cardType)} className="text-gray-400 hover:text-blue-600 p-2 rounded-md hover:bg-blue-50 transition-colors" title="Sửa">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(cardType._id)} className="text-gray-400 hover:text-red-600 p-2 rounded-md hover:bg-red-50 transition-colors" title="Xóa">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Thêm/Sửa */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingId ? "Cập nhật Loại thẻ" : "Thêm Loại thẻ mới"}
                </h3>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Tên loại thẻ</label>
                  {/* Ô input này tôn trọng hoàn toàn chữ hoa/thường người dùng gõ vào */}
                  <input required placeholder="VD: Visa, Mastercard" className="w-full p-2.5 bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Logo Loại thẻ</label>
                  <div className="flex items-center gap-4">
                    <input type="file" accept="image/*" onChange={handleImageUpload}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                    {formData.logo && (
                      <div className="shrink-0 w-16 h-10 border border-gray-200 rounded flex items-center justify-center p-1 bg-white">
                        <MasterdataLogoImage src={formData.logo} alt="Preview" fallbackLabel={formData.name} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={closeModal} className="px-5 py-2.5 text-gray-900 font-medium hover:bg-gray-100 rounded-lg transition-colors">
                    Hủy bỏ
                  </button>
                  <button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-70 flex items-center gap-2">
                    {isSubmitting ? "Đang xử lý..." : editingId ? "Cập nhật" : "Lưu dữ liệu"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
