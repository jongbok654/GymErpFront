// src/pages/Sales/SalesItemDetail.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import axios from "axios";
import SalesItemSearchModal from "../../components/SalesItemSearchModal";

const DETAIL_API  = (id) => `/v1/sales/products/${id}`;
const UPDATE_API  = (id) => `/v1/sales/products/${id}`;
const DELETE_API  = (id) => `/v1/sales/products/${id}`;

export default function SalesItemDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();

  const stateId = location.state?.itemId;
  const queryId = searchParams.get("id");
  const itemId  = stateId ?? paramId ?? queryId ?? null;

  const [mode, setMode] = useState("view"); 
  const readOnly = mode === "view";

  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");

  const [form, setForm] = useState({
    itemSalesId: "",
    productId: null,
    productName: "",
    productType: "",
    empNum: "",          // 저장/수정용 사번
    empEmail: "",        // 화면표시용(판매자 이메일)
    quantity: 1,
    unitPrice: 0,
    createdAt: "",       // yyyy-MM-dd (표시용)
    updatedAt: "",       // yyyy-MM-dd (표시용)
  });

  // 처음 조회값 스냅샷 (수정취소 복원용)
  const initialFormRef = useRef(null);

  const [productModalOpen, setProductModalOpen] = useState(false);
  const patch = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const totalAmount = useMemo(() => {
    const q = Number(form.quantity || 0);
    const u = Number(form.unitPrice || 0);
    return q * u;
  }, [form.quantity, form.unitPrice]);

  const numFmt = (v) => Number(v || 0).toLocaleString();

  const toDateInput = (v) => {
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // 인풋 자체 배경색: 수정 가능 → 흰색, 그 외 → 연회색
  const ctrlStyle = (editable) =>
    editable && !readOnly ? { backgroundColor: "#ffffff" } : { backgroundColor: "#f1f3f5" };

  // 상세 재조회 헬퍼 (저장 직후 updatedAt 반영용)
  const fetchDetail = async (id, { snapshotIfEmpty = false } = {}) => {
    const { data } = await axios.get(DETAIL_API(id));
    const next = {
      itemSalesId: data.itemSalesId,
      productId: data.productId,
      productName: data.productName,
      productType: data.productType,
      empNum: data.empNum ?? "",
      empEmail: data.empEmail ?? "",
      quantity: data.quantity ?? 1,
      unitPrice: data.unitPrice ?? 0,
      createdAt: toDateInput(data.createdAt),
      updatedAt: toDateInput(data.updatedAt ?? data.modifiedAt),
    };
    setForm(next);
    if (snapshotIfEmpty && !initialFormRef.current) {
      initialFormRef.current = JSON.parse(JSON.stringify(next));
    }
  };

  // itemId가 바뀌면 스냅샷 초기화
  useEffect(() => {
    initialFormRef.current = null;
  }, [itemId]);

  // 상세 조회
  useEffect(() => {
    if (!itemId) {
      setErr("상세를 표시할 항목 ID가 없습니다.");
      return;
    }
    (async () => {
      setErr("");
      setLoading(true);
      try {
        await fetchDetail(itemId, { snapshotIfEmpty: true });
      } catch (e) {
        console.error("상세 조회 실패:", e);
        setErr(
          e?.response?.data?.message ||
            `상세 조회에 실패했습니다. (Error: ${e.response?.status || e.message})`
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [itemId]); 

  // 저장: **상품명 / 판매 수량만** 변경 (나머지는 서버 관리)
  const handleSave = async () => {
    if (readOnly) return;
    if (!form.productId || !form.productName) return setErr("상품을 선택하세요.");
    if (form.quantity < 0) return setErr("수량은 0 이상이어야 합니다.");

    setSaving(true);
    setErr("");
    try {
      const idForSave = form.itemSalesId || itemId;

      const payload = {
        itemSalesId: idForSave,
        productId: form.productId,
        productName: form.productName,
        empNum: form.empNum || null, 
        quantity: Number(form.quantity ?? 0),
        totalAmount,                  
      };

      await axios.put(UPDATE_API(idForSave), payload);

      await fetchDetail(idForSave);

      setMode("view");
    } catch (e) {
      console.error("저장 실패:", e);
      console.error("백엔드 응답 오류:", e.response);

      // 백엔드에서 오는 특정 오류 메시지 확인
      if (e.response && e.response.status === 409) { // 재고 문제에 대한 Conflict 상태
        setErr(e.response.data || "재고 수량 부족으로 저장에 실패했습니다.");
      } else {
        setErr(e?.response?.data?.message || "저장 중 오류가 발생했습니다.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (initialFormRef.current) {
      setForm(JSON.parse(JSON.stringify(initialFormRef.current)));
    }
    setMode("view");
  };

  const handleDelete = async () => {
    if (!itemId) return;
    const ok = window.confirm("정말 삭제하시겠습니까?");
    if (!ok) return;

    try {
      await axios.delete(DELETE_API(itemId));
      alert("판매 내역이 삭제되었습니다.");
      navigate(-1);
    } catch (e) {
      console.error("삭제 실패:", e);
      alert(e?.response?.data?.message || "삭제 중 오류가 발생했습니다.");
    }
  };

  // 상품 검색 (수정 모드에서만)
  const openProductSearch = () => {
    if (readOnly) return;
    setProductModalOpen(true);
  };

  // 제목: n번 판매상품내역 조회 / n번 상품판매내역 수정
  const displayId = form.itemSalesId || itemId || "-";
  const titleText = readOnly
    ? `${displayId}번 판매상품내역 조회`
    : `${displayId}번 상품판매내역 수정`;

  return (
    <div
      className="d-flex"
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#f8f9fa',
        overflowX: 'hidden',
      }}
    >
      <main
        className="flex-grow-1 d-flex justify-content-center align-items-center"
        style={{ padding: '40px 20px', boxSizing: 'border-box' }}
      >
        <div
          className="content-wrapper"
          style={{
            width: '100%',
            maxWidth: '900px',
            backgroundColor: '#fff',
            borderRadius: '10px',
            padding: '45px 40px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            boxSizing: 'border-box',
            marginBottom: '25vh',
          }}
        >
          <h2 className="border-bottom pb-2 mb-4 fw-bold">
            {titleText}
            <br />
            <br />
          </h2>

          {err && <div className="alert alert-danger mb-3">{err}</div>}

          {loading ? (
            <div className="py-5 text-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => e.preventDefault()} className="border rounded-4 shadow-sm overflow-hidden mt-4">
              <table className="table m-0 align-middle text-center">
                <tbody>
                  {/* 상품명 */}
                  <tr>
                    <th className="bg-dark text-white text-center align-middle" style={{ width: "30%" }}>상품명</th>
                    <td className="bg-light align-middle position-relative">
                      <div className="d-flex justify-content-center" style={{ width: 340, margin: "0 auto" }}>
                        <input
                          type="text"
                          className="form-control text-center"
                          value={form.productName}
                          placeholder="상품명"
                          onClick={openProductSearch}
                          readOnly={readOnly}
                          style={ctrlStyle(true)}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary position-absolute"
                          style={{ right: "calc(50% - 170px - 45px)", height: 38 }}
                          onClick={openProductSearch}
                          disabled={readOnly}
                          title="상품 검색"
                        >
                          <i className="bi bi-search" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* 구분 */}
                  <tr>
                    <th className="bg-dark text-white text-center align-middle">구분</th>
                    <td className="bg-light align-middle">
                      <input className="form-control text-center mx-auto" style={{ ...ctrlStyle(false), width: 340 }} value={form.productType} readOnly />
                    </td>
                  </tr>

                  {/* 판매자 이메일 */}
                  <tr>
                    <th className="bg-dark text-white text-center align-middle">판매자 이메일</th>
                    <td className="bg-light align-middle">
                      <input className="form-control text-center mx-auto" style={{ ...ctrlStyle(false), width: 340 }} value={form.empEmail} readOnly placeholder="판매자 이메일" />
                    </td>
                  </tr>

                  {/* 판매 수량 */}
                  <tr>
                    <th className="bg-dark text-white text-center align-middle">판매 수량</th>
                    <td className="bg-light align-middle">
                      <input
                        type="number"
                        min="0"
                        className="form-control text-center mx-auto"
                        style={{ ...ctrlStyle(true), width: 340 }}
                        value={form.quantity}
                        onChange={(e) => patch("quantity", Number(e.target.value || 0))}
                        readOnly={readOnly}
                      />
                    </td>
                  </tr>

                  {/* 단가 */}
                  <tr>
                    <th className="bg-dark text-white text-center align-middle">단가 (원)</th>
                    <td className="bg-light align-middle">
                      <input className="form-control text-center mx-auto" style={{ ...ctrlStyle(false), width: 340 }} value={numFmt(form.unitPrice)} readOnly />
                    </td>
                  </tr>

                  {/* 총액 */}
                  <tr>
                    <th className="bg-dark text-white text-center align-middle">총액 (원)</th>
                    <td className="bg-light align-middle">
                      <input className="form-control text-center mx-auto" style={{ ...ctrlStyle(false), width: 340 }} value={numFmt(totalAmount)} readOnly />
                    </td>
                  </tr>

                  {/* 등록일 */}
                  <tr>
                    <th className="bg-dark text-white text-center align-middle">등록일</th>
                    <td className="bg-light align-middle">
                      <input type="date" className="form-control text-center mx-auto" style={{ ...ctrlStyle(false), width: 340 }} value={form.createdAt} readOnly />
                    </td>
                  </tr>

                  {/* 수정일 */}
                  <tr>
                    <th className="bg-dark text-white text-center align-middle">수정일</th>
                    <td className="bg-light align-middle">
                      <input type="date" className="form-control text-center mx-auto" style={{ ...ctrlStyle(false), width: 340 }} value={form.updatedAt} readOnly />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 하단 액션 바 */}
              <div className="text-center p-3 bg-white border-top d-flex justify-content-center gap-2">
                {readOnly ? (
                  <>
                    <button className="btn btn-primary" onClick={() => setMode("edit")} disabled={!itemId}>
                      수정
                    </button>
                    <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                      확인
                    </button>
                    <button className="btn btn-danger" onClick={handleDelete}>
                      삭제
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-secondary" onClick={handleCancelEdit} disabled={saving}>
                      수정취소
                    </button>
                    <button className="btn btn-success" onClick={handleSave} disabled={saving || loading}>
                      {saving ? "저장 중..." : "저장"}
                    </button>
                    <button className="btn btn-danger" onClick={handleDelete} disabled={saving || loading}>
                      삭제
                    </button>
                  </>
                )}
              </div>
            </form>
          )}

          {/* 상품 검색 모달 (수정 모드에서만) */}
          <SalesItemSearchModal
            show={productModalOpen}
            onHide={() => setProductModalOpen(false)}
            onExited={() => {}}
            onSelect={(p) => {
              setForm((f) => ({
                ...f,
                productId: p.productId,
                productName: p.name,
                productType: p.codeBId || "PRODUCT",
                unitPrice: p.price ?? f.unitPrice,
              }));
              setProductModalOpen(false);
            }}
          />
        </div>
      </main>
    </div>
  );
}
