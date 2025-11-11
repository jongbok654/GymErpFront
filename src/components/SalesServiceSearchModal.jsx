// src/components/SalesServiceSearchModal.jsx
import { useEffect, useMemo, useState } from "react";
import { Modal, Button, Table, Form, InputGroup } from "react-bootstrap";
import axios from "axios";


const LIST_API = "/v1/modals/services";

export default function SalesServiceSearchModal({
  show,
  onHide,
  onExited,
  onSelect,
  categories = [], 
}) {
  const [list, setList] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [totalCount, setTotalCount] = useState(0);
  const totalPage = useMemo(
    () => Math.max(1, Math.ceil((totalCount || 0) / limit)),
    [totalCount]
  );

  const [pickedCats, setPickedCats] = useState(new Set()); 

  const fetchList = async (signal) => {
    try {
      const params = { keyword, page, limit };
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") searchParams.append(k, v);
      });
      [...pickedCats].forEach((c) => searchParams.append("categoryCodes", c));

      const url = `${LIST_API}?${searchParams.toString()}`;
      const { data } = await axios.get(url, { signal });
      const rows = Array.isArray(data?.list) ? data.list : [];
      setList(rows);
      setTotalCount(Number(data?.totalCount ?? 0));
    } catch (e) {
      if (axios.isCancel(e) || e.name === "CanceledError") return;
      console.error("서비스 검색 실패:", e);
      setList([]);
      setTotalCount(0);
    }
  };

  // 모달이 열리면 초기화 & 첫 로드
  useEffect(() => {
    if (!show) return;
    setPage(1);
    setKeyword("");
    setPickedCats(new Set());
    const controller = new AbortController();
    fetchList(controller.signal);
    return () => controller.abort();
  }, [show]);

  // ✅ 키입력/페이지/카테고리 변경 시 자동 조회 (디바운스 300ms)
  useEffect(() => {
    if (!show) return;
    const controller = new AbortController();
    const t = setTimeout(() => fetchList(controller.signal), 300);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [keyword, page, pickedCats, show]);

  const fmt = (v) => (v ?? 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const toggleCat = (code) =>
    setPickedCats((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      setPage(1); // 카테고리 변경 시 1페이지
      return next;
    });

  const handleSearch = () => {
    if (page !== 1) setPage(1);
    else fetchList();
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      onExited={onExited}
      centered
      size="lg"
      backdrop="static"
      keyboard
      unmountOnClose
    >
      {/* ✅ 제목 가운데 + 커스텀 닫기 버튼 위치 고정 */}
      <Modal.Header className="border-0">
        <div className="w-100 d-flex align-items-center justify-content-center position-relative">
          <h3 className="m-0 fw-bold">서비스 검색 / 선택</h3>
          <button
            type="button"
            className="btn-close position-absolute end-0 top-0 mt-2 me-2"
            aria-label="Close"
            onClick={onHide}
          />
        </div>
      </Modal.Header>

      <Modal.Body>
        {/* ✅ 상단 바: 왼쪽(카테고리) / 오른쪽(검색창) */}
        <div className="mb-3 d-flex align-items-center justify-content-between gap-3">
          {/* 왼쪽: 카테고리 체크들 (있을 때만 표시) */}
          {categories?.length > 0 ? (
            <div className="d-flex flex-wrap gap-2">
              {categories.map(({ code, label }) => (
                <Form.Check
                  key={code}
                  inline
                  type="checkbox"
                  id={`svc-cat-${code}`}
                  label={label ?? code}
                  checked={pickedCats.has(code)}
                  onChange={() => toggleCat(code)}
                />
              ))}
            </div>
          ) : (
            <div /> // 자리를 맞추기 위한 비어있는 블록
          )}

          {/* 오른쪽: 검색창(고정폭 280px) + 버튼 */}
          <div style={{ width: 280 }}>
            <InputGroup size="sm">
              <Form.Control
                placeholder="검색어 입력..."
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  if (page !== 1) setPage(1);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button variant="secondary" onClick={handleSearch}>
                검색
              </Button>
            </InputGroup>
          </div>
        </div>

        {/* 목록 */}
        <Table hover bordered className="text-center align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ width: "15%" }}>구분</th>
              <th>상품명</th>
              <th style={{ width: "18%" }}>단가(원)</th>
              <th style={{ width: "12%" }}>선택</th>
            </tr>
          </thead>
          <tbody>
            {list.length ? (
              list.map((s) => (
                <tr
                  key={s.serviceId ?? `${s.codeBId}-${s.name}`}
                  onDoubleClick={() => onSelect?.(s)}
                  style={{ cursor: "pointer" }}
                >
                  <td className="fw-semibold">{s.categoryCode ?? s.codeBId}</td>
                  <td className="text-start">{s.serviceName ?? s.name}</td>
                  <td className="fw-bold">{fmt(s.price)}</td>
                  <td>
                    <Button size="sm" variant="primary" onClick={() => onSelect?.(s)}>
                      선택
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-muted py-3">
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </Table>

        {/* 페이지네이션 */}
        <div className="d-flex justify-content-center gap-2">
          <Button
            size="sm"
            variant="outline-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            이전
          </Button>
          <span className="align-self-center">
            {page} / {totalPage}
          </span>
          <Button
            size="sm"
            variant="outline-secondary"
            disabled={page >= totalPage}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
}
