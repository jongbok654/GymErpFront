// src/pages/EmpList.jsx
import { useState, useEffect, useDeferredValue, useMemo } from "react";
import axios from "axios";
import EmpDetail from "./EmpDetail.jsx";
import EmpModal from "../components/EmpModal";
import 'bootstrap-icons/font/bootstrap-icons.css';
import "../components/css/EmpList.css";
import "../components/css/detail-pane.css";

export default function EmpList() {
  // 목록/선택/모드 상태
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState("none"); // 'none' | 'detail' | 'create'

  // 검색/필터/정렬 상태
  const [searchKeyword, setSearchKeyword] = useState("");
  const deferredKw = useDeferredValue(searchKeyword);
  const [status, setStatus] = useState("ALL");     // 'ALL' | 'ACTIVE' | 'RESIGNED'
  const [sort, setSort] = useState("NAME_ASC");    // 'NAME_ASC' | 'HIRE_ASC'
  const [loading, setLoading] = useState(false);

  // 직원 데이터 로딩 (선언식: 호이스팅 OK)
  async function loadEmployees() {
    setLoading(true);
    try {
      const kw = deferredKw.trim();
      const params = { page: 1, size: 1000 };
      if (kw) params.keyword = kw;
      // 상태 조건에 따라 서버 파라미터 설정 (백엔드 규격에 맞게 수정)
      if (status === "ACTIVE") params.status = "ACTIVE";
      else if (status === "RESIGNED") params.status = "RESIGNED";

      const res = await axios.get("/v1/emp/list/paging", { params });
      setEmployees(res.data.list || []);
    } catch (err) {
      console.error("직원 목록 조회 실패:", err);
    } finally {
      setLoading(false);
    }
  }

  // 검색어/상태 변경 시 목록 다시 로딩
  useEffect(() => { loadEmployees(); }, [deferredKw, status]);

  // 정렬 로직
  const sortedEmployees = useMemo(() => {
    const list = [...employees];
    if (sort === "NAME_ASC") {
      list.sort((a,b) => (a.empName || "").localeCompare(b.empName || "", "ko-KR", { sensitivity:"base" }));
    } else if (sort === "HIRE_ASC") {
      list.sort((a,b) => new Date(a.hireDate || 0) - new Date(b.hireDate || 0));
    }
    return list;
  }, [employees, sort]);

  // 오른쪽 패널 랜더링
  const renderRight = () => {
    if (mode === "create") {
      // 직원 등록: 기존 EmpModal 재활용
      return (
        <EmpModal
          show={true}
          onClose={() => setMode("none")}
          onSuccess={async () => {
            await loadEmployees();
            setMode("none");
          }}
        />
      );
    }
    if (mode === "detail" && selectedId) {
      return (
        <EmpDetail
          key={selectedId}
          empNum={selectedId}
          onBack={() => {
            setMode("none");
            setSelectedId(null);
          }}
        />
      );
    }
    return (
      <div className="d-flex justify-content-center align-items-center h-100 text-muted">
        좌측에서 직원을 선택하거나 [직원 등록]을 눌러주세요.
      </div>
    );
  };

  return (
    <div className="d-flex" style={{ height:"100vh", overflow:"hidden" }}>
      {/* 왼쪽 패널 */}
      <div
        style={{ width:"350px", borderRight:"1px solid #dee2e6", overflowY:"auto" }}
        className="bg-light d-flex flex-column"
      >
        {/* 직원 등록 버튼 */}
        <div className="p-3 border-bottom">
          <button
            className="btn btn-primary w-100"
            onClick={() => {
              setMode("create");
              setSelectedId(null);
            }}
          >
            <i className="bi bi-plus-lg me-2"></i>직원 등록
          </button>
        </div>

        {/* 상태 필터 */}
        <div className="p-3 border-bottom">
          <div className="btn-group w-100 mb-2">
            <button className={`btn btn-outline-secondary ${status === "ALL" ? "active" : ""}`} onClick={() => setStatus("ALL")}>전체</button>
            <button className={`btn btn-outline-secondary ${status === "ACTIVE" ? "active" : ""}`} onClick={() => setStatus("ACTIVE")}>재직중</button>
            <button className={`btn btn-outline-secondary ${status === "RESIGNED" ? "active" : ""}`} onClick={() => setStatus("RESIGNED")}>퇴직</button>
          </div>
          <div className="text-muted small">
            전체 {employees.length}명
          </div>
        </div>

        {/* 검색/정렬 */}
        <div className="p-3 border-bottom">
          <input
            type="text"
            className="form-control mb-2"
            placeholder="직원이름 / 연락처 검색"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          <div className="d-flex align-items-center gap-2">
            <label className="form-label mb-0 small text-muted">정렬</label>
            <select
              className="form-select form-select-sm"
              style={{ maxWidth:220 }}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="NAME_ASC">이름순 (가-하)</option>
              <option value="HIRE_ASC">입사일 빠른순</option>
            </select>
          </div>
        </div>

        {/* 직원 리스트 */}
        <div className="flex-grow-1">
          {loading ? (
            <div className="p-3 text-center text-muted">불러오는 중…</div>
          ) : sortedEmployees.length === 0 ? (
            <div className="p-3 text-center text-muted">검색된 직원이 없습니다.</div>
          ) : (
            sortedEmployees.map((emp) => (
              <div
                key={emp.empNum}
                className={`p-3 border-bottom small ${selectedId === emp.empNum && mode !== "create" ? "bg-primary text-white" : "bg-white"}`}
                style={{ cursor:"pointer" }}
                onClick={() => {
                  setSelectedId(emp.empNum);
                  setMode("detail");
                }}
              >
                <div className="fw-semibold">{emp.empName || "-"}</div>
                <div className={`mt-1 small ${selectedId === emp.empNum && mode !== "create" ? "text-white-50" : "text-muted"}`}>
                  <i className="bi bi-telephone me-1"></i>{emp.empPhone || "-"}
                  <span className="mx-2">·</span>
                  <i className="bi bi-envelope me-1"></i>{emp.empEmail || "-"}
                  <span className="float-end">
                    <span className={`badge rounded-pill ${emp.fireDate ? "bg-secondary" : "bg-success"}`}>
                      {emp.fireDate ? "퇴직" : "재직중"}
                    </span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 오른쪽 패널 */}
      <div className="right-pane flex-grow-1 p-4 overflow-auto">
        {renderRight()}
      </div>
    </div>
  );
}
