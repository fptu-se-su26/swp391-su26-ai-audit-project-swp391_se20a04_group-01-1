import React, { useEffect, useState } from 'react';
import { poiAPI } from '../../services/api';
import { MapPin, Edit2, Trash2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { showPremiumToast } from '../../utils/toastUtils';
import AddPOIModal from '../Home/components/AddPOIModal';

export default function MyPOIsTab() {
  const [pois, setPois] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPoi, setEditingPoi] = useState<any>(null);

  const fetchPOIs = async () => {
    try {
      setIsLoading(true);
      const res = await poiAPI.getMyPOIs();
      if (res.data && res.data.success) {
        setPois(res.data.data);
      }
    } catch (error) {
      console.error(error);
      showPremiumToast('Không thể tải danh sách địa điểm', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPOIs();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa địa điểm này?')) return;
    try {
      await poiAPI.deletePOI(id);
      showPremiumToast('Xóa địa điểm thành công', 'success');
      fetchPOIs();
    } catch (error) {
      console.error(error);
      showPremiumToast('Lỗi khi xóa địa điểm', 'error');
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <div style={{ fontSize: "14px", color: "#6b7280" }}>
          ⏳ Đang tải địa điểm...
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <MapPin className="text-blue-500" size={24} />
          Địa điểm của tôi
        </h2>
      </div>

      {pois.length === 0 ? (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "40px",
            textAlign: "center",
            border: "2px dashed #d1d5db",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          }}
        >
          <MapPin
            size={48}
            style={{ color: "#9ca3af", margin: "0 auto 12px" }}
          />
          <p style={{ color: "#9ca3af", fontSize: "13px", margin: 0 }}>
            Bạn chưa đóng góp địa điểm nào.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "16px",
          }}
        >
          {pois.map((poi) => (
            <div
              key={poi.poi_id}
              className="group"
              style={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "16px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                transition: "all 0.3s ease",
              }}
            >
              <div style={{ display: "flex", gap: "16px" }}>
                <div
                  style={{
                    width: "80px",
                    height: "80px",
                    backgroundColor: "#f3f4f6",
                    borderRadius: "12px",
                    flexShrink: 0,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {poi.image_url ? (
                    <img
                      src={`http://localhost:5001${poi.image_url}`}
                      alt={poi.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <MapPin style={{ color: "#9ca3af" }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3
                    style={{
                      fontSize: "15px",
                      fontWeight: "bold",
                      color: "#1f2937",
                      margin: "0 0 4px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {poi.name}
                  </h3>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "#6b7280",
                      margin: "0 0 8px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {poi.address || "Chưa có địa chỉ"}
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {poi.status === "pending" && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          backgroundColor: "#fef3c7",
                          color: "#d97706",
                          fontSize: "11px",
                          fontWeight: "600",
                        }}
                      >
                        <Clock size={12} /> Chờ duyệt
                      </span>
                    )}
                    {poi.status === "approved" && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          backgroundColor: "#d1fae5",
                          color: "#059669",
                          fontSize: "11px",
                          fontWeight: "600",
                        }}
                      >
                        <CheckCircle2 size={12} /> Đã duyệt
                      </span>
                    )}
                    {poi.status === "rejected" && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          backgroundColor: "#fee2e2",
                          color: "#dc2626",
                          fontSize: "11px",
                          fontWeight: "600",
                        }}
                      >
                        <XCircle size={12} /> Đã từ chối
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <button
                  onClick={() => setEditingPoi(poi)}
                  style={{
                    padding: "6px",
                    backgroundColor: "white",
                    color: "#2563eb",
                    borderRadius: "8px",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                    cursor: "pointer",
                    border: "1px solid #e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Sửa"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(poi.poi_id)}
                  style={{
                    padding: "6px",
                    backgroundColor: "white",
                    color: "#dc2626",
                    borderRadius: "8px",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                    cursor: "pointer",
                    border: "1px solid #e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Xóa"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingPoi && (
        <AddPOIModal
          initialData={editingPoi}
          onClose={() => setEditingPoi(null)}
          onSubmitSuccess={() => {
            setEditingPoi(null);
            fetchPOIs();
          }}
        />
      )}
    </div>
  );
}
