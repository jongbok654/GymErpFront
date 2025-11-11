// src/components/EmpSearchModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Button, Table, Form, Badge, ListGroup, InputGroup } from "react-bootstrap";
import axios from "axios";

const LIST_API = "/v1/modals/employees";

export default function EmpSearchModal({
  show,
  onHide,
  onExited,
  onSuccess,      // ✅ onConfirm → onSuccess로 통일
  selectedEmp,    // ✅ 부모에서 전달받은 선택된 직원 정보
}) {
  // ---- 선택/장바구니 정책(하드 코딩) ----
  const MULTI_SELECT = true;
  const MAX_SELECT = 3;

  // ---- 목록/검색 페이징 ----
  const [list, setList] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [totalCount, setTotalCount] = useState(0);
  const totalPage = useMemo(
    () => Math.max(1, Math.ceil((totalCount || 0) / limit)),
    [totalCount]
  );

  // ---- 선택 상태: id -> row ----
  const [selected, setSelected] = useState({});
  const getId = (row) => row?.empNum ?? row?.empId ?? row?.id;
  const selectedArr = useMemo(() => Object.values(selected), [selected]);
  const selectedCount = selectedArr.length;

  // ---- 진행 중 요청 취소용 ----
  const controllerRef = useRef(null);

  // ---- API ----
  const fetchList = async ({ kw = keyword, pg = page } = {}) => {
    if (controllerRef.current) controllerRef.current.abort();
    controllerRef.current = new AbortController();

    try {
      const { data } = await axios.get(LIST_API, {
        params: { keyword: kw, page: pg, limit },
        signal: controllerRef.current.signal,
      });
      const rows = Array.isArray(data?.list) ? data.list : [];
      setList(rows);
      setTotalCount(Number(data?.totalCount ?? 0));
    } catch (e) {
      if (axios.isCancel?.(e) || e.name === "CanceledError") return;
      console.error("직원 검색 실패:", e);
      setList([]); setTotalCount(0);
    }
  };

  // ✅ 모달 열릴 때 초기화 & 첫 로드
  useEffect(() => {
    if (!show) return;
    setPage(1);
    setKeyword("");
    fetchList({ kw: "", pg: 1 });

    // ✅ 이미 선택된 직원이 있으면 유지
    if (selectedEmp && selectedEmp.empNum) {
      setSelected({
        [selectedEmp.empNum]: {
          empNum: selectedEmp.empNum,
          empName: selectedEmp.empName,
        },
      });
    }

    return () => controllerRef.current?.abort();
  }, [show]);

  // 페이지 변경 시 로드
  useEffect(() => {
    if (show) fetchList({ pg: page });
  }, [page]);

  // 키워드 변경 시 디바운스 검색 (실시간 LIKE)
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => {
      setPage(1);
      fetchList({ kw: keyword, pg: 1 });
    }, 300);
    return () => {
      clearTimeout(t);
      controllerRef.current?.abort();
    };
  }, [keyword, show]);

  const handleSearch = () => {
    if (page !== 1) setPage(1);
    else fetchList({ kw: keyword, pg: 1 });
  };

  // ---- 선택 토글(초과 시 강제 차단) ----
  const toggleRowSafe = (row) => {
    const id = getId(row);
    if (id == null) return;

    if (!MULTI_SELECT) {
      setSelected((prev) => (prev[id] ? {} : { [id]: row }));
      return;
    }

    setSelected((prev) => {
      const already = !!prev[id];
      if (already) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      const count = Object.keys(prev).length;
      if (count >= MAX_SELECT) {
        alert(`최대 ${MAX_SELECT}명까지 선택할 수 있습니다.`);
        return prev;
      }
      return { ...prev, [id]: row };
    });
  };

  const isChecked = (row) => {
    const id = getId(row);
    return id != null && !!selected[id];
  };

  const removeFromBasket = (id) => {
    setSelected((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const clearBasket = () => setSelected({});

  // ✅ 확인 버튼 핸들러 수정
  const handleConfirm = () => {
    if (selectedCount === 0) {
      alert("직원을 선택하세요.");
      return;
    }
    onSuccess?.(selectedArr); // 부모로 전달
    onHide?.(); // 닫기
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
      <Modal.Header closeButton>
        <Modal.Title>직원 검색 / 선택</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* 🔎 검색바만: 오른쪽 끝 + 고정폭 280px */}
        <div className="mb-3 d-flex justify-content-end">
          <div style={{ width: 280 }}>
            <InputGroup size="sm">
              <Form.Control
                placeholder="검색어 입력..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                autoFocus
              />
              <Button variant="secondary" onClick={handleSearch}>검색</Button>
            </InputGroup>
          </div>
        </div>

        <div className="row">
          {/* 왼쪽: 목록 */}
          <div className="col-8">
            <Table hover bordered className="text-center align-middle">
              <thead className="table-light">
                <tr>
                  <th style={{ width: "8%" }}>
                    체크{" "}
                    <small className="text-muted">
                      ({selectedCount}/{MAX_SELECT})
                    </small>
                  </th>
                  <th style={{ width: "22%" }}>직원명</th>
                  <th style={{ width: "25%" }}>연락처</th>
                  <th>이메일</th>
                </tr>
              </thead>
              <tbody>
                {list.length ? (
                  list.map((row) => {
                    const id = getId(row);
                    const checked = isChecked(row);
                    const basketFull = !checked && selectedCount >= MAX_SELECT;

                    return (
                      <tr
                        key={id}
                        onDoubleClick={() => { if (!basketFull) toggleRowSafe(row); }}
                        onClick={() => { if (!basketFull) toggleRowSafe(row); }}
                        style={{
                          cursor: basketFull ? "not-allowed" : "pointer",
                          opacity: basketFull ? 0.6 : 1
                        }}
                        title={basketFull ? `최대 ${MAX_SELECT}명까지 선택 가능합니다.` : ""}
                      >
                        <td onClick={(ev) => ev.stopPropagation()}>
                          <Form.Check
                            type="checkbox"
                            checked={checked}
                            disabled={basketFull}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleRowSafe(row);
                            }}
                          />
                        </td>
                        <td className="text-start">{row.empName ?? "-"}</td>
                        <td>{row.empPhone ?? "-"}</td>
                        <td className="text-start">{row.empEmail ?? "-"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="text-muted py-3">검색 결과가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </Table>

            {/* 좌측 하단: 페이지네이션 */}
            <div className="d-flex gap-2">
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
          </div>

          {/* 오른쪽: 장바구니 */}
          <div className="col-4">
            <div className="border rounded p-2 h-100">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="fw-semibold">
                  선택한 직원
                  <Badge bg={selectedCount >= MAX_SELECT ? "danger" : "secondary"} className="ms-2">
                    {selectedCount} / {MAX_SELECT}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={clearBasket}
                  disabled={selectedCount === 0}
                >
                  비우기
                </Button>
              </div>

              <ListGroup variant="flush">
                {selectedArr.length ? (
                  selectedArr.map((emp) => {
                    const id = getId(emp);
                    return (
                      <ListGroup.Item
                        key={id}
                        className="d-flex justify-content-between align-items-center"
                      >
                        <div>
                          <div className="fw-semibold">
                            {emp.empName} <small className="text-muted">({id})</small>
                          </div>
                          <div className="small text-muted">
                            {emp.empPhone} · {emp.empEmail}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => removeFromBasket(id)}
                          title="제거"
                        >
                          삭제
                        </Button>
                      </ListGroup.Item>
                    );
                  })
                ) : (
                  <div className="text-muted small p-2">선택된 직원이 없습니다.</div>
                )}
              </ListGroup>
            </div>
          </div>
        </div>

        {/* 하단 오른쪽: 확인 버튼 */}
        <div className="d-flex justify-content-end mt-3">
          <Button
            size="sm"
            variant="success"
            onClick={handleConfirm}
            disabled={selectedCount === 0}
          >
            확인
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
}
