import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Pagination from "../../components/Pagination";
import { FaSearch } from "react-icons/fa";
import MemberSearchModal from "../../components/MemberSearchModal";

function SalesVoucherList() {
  const [voucherList, setVoucherList] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [voucherTotalPage, setVoucherTotalPage] = useState(1);
  const [voucherPage, setVoucherPage] = useState(1);
  const [voucherLoading, setVoucherLoading] = useState(false);

  // ✅ 필터 상태 (유효여부 필터 추가)
  const [voucherFilters, setVoucherFilters] = useState({
    startDate: "",
    endDate: "",
    member: "",
    memberName: "",
    validityFilter: "전체", // ✅ 추가
  });

  const [showMemberModal, setShowMemberModal] = useState(false);
  const tableRef = useRef(null);

  // ✅ 데이터 조회
  useEffect(() => {
    fetchVoucherList();
  }, [voucherPage, voucherFilters]);

  const fetchVoucherList = async () => {
    setVoucherLoading(true);
    try {
      const res = await axios.get("/v1/log/voucher/paged", {
        params: {
          page: voucherPage,
          limit: 20,
          startDate: voucherFilters.startDate || undefined,
          endDate: voucherFilters.endDate || undefined,
          memNum: voucherFilters.member || undefined,
          validityFilter:
            voucherFilters.validityFilter === "전체"
              ? undefined
              : voucherFilters.validityFilter, // ✅ 전체 선택 시 필터 제외
        },
      });

      console.log("📘 [FRONT/Voucher] 응답 데이터:", res.data);
      const { list, totalCount } = res.data;

      const normalizedList = (list || []).map((v) => ({
        voucherId: v.VOUCHERID ?? v.voucherId,
        memberName: v.MEMBERNAME ?? v.memberName,
        startDate: v.STARTDATE ?? v.startDate,
        endDate: v.ENDDATE ?? v.endDate,
        validity: v.VALIDITY ?? v.validity,
      }));

      setVoucherList(normalizedList);
      setVoucherTotalPage(Math.ceil(totalCount / 20));
    } catch (err) {
      console.error("회원권 내역 조회 실패:", err);
    } finally {
      setVoucherLoading(false);
    }
  };

  // ✅ 필터 변경
  const handleVoucherFilterChange = (key, value) =>
    setVoucherFilters((prev) => ({ ...prev, [key]: value }));

  const resetVoucherFilters = () => {
    setVoucherFilters({
      startDate: "",
      endDate: "",
      member: "",
      memberName: "",
      validityFilter: "전체", // 초기화 포함
    });
  };

  const handleSelectMemberVoucher = (member) => {
    setVoucherFilters((prev) => ({
      ...prev,
      member: member.memNum,
      memberName: member.memName,
    }));
    setShowMemberModal(false);
  };

  const handleRowClick = (id) => setSelectedRow(Number(id));

  return (
    <div
      className="d-flex"
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#f8f9fa",
        overflowX: "hidden",
      }}
    >
      <main
        className="flex-grow-1 d-flex justify-content-center"
        style={{ padding: "40px 20px", boxSizing: "border-box" }}
      >
        <div
          className="content-wrapper"
          style={{
            width: "100%",
            maxWidth: "1200px",
            backgroundColor: "#fff",
            borderRadius: "10px",
            padding: "30px 40px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
            boxSizing: "border-box",
          }}
        >
          <h2 className="border-bottom pb-2 mb- fw-bold">
            회원권 내역 조회
            <br />
            <br />
          </h2>

          {/* 필터 바 */}
          <div
            className="d-flex align-items-center flex-nowrap justify-content-end"
            style={{
              gap: "16px",
              overflowX: "auto",
              whiteSpace: "nowrap",
              width: "100%",
            }}
          >
            {/* 기간 */}
            <div className="d-flex align-items-center flex-shrink-0">
              <span className="me-2 fw-semibold">기간</span>
              <input
                type="date"
                className="form-control"
                style={{ width: "140px" }}
                value={voucherFilters.startDate}
                onChange={(e) =>
                  handleVoucherFilterChange("startDate", e.target.value)
                }
              />
              <span className="mx-2">~</span>
              <input
                type="date"
                className="form-control"
                style={{ width: "140px" }}
                value={voucherFilters.endDate}
                onChange={(e) =>
                  handleVoucherFilterChange("endDate", e.target.value)
                }
              />
            </div>

            {/* 회원 */}
            <div className="d-flex align-items-center flex-shrink-0">
              <span className="me-2 fw-semibold">회원</span>
              <input
                type="text"
                className="form-control"
                style={{ width: "180px" }}
                placeholder="선택된 회원"
                value={voucherFilters.memberName}
                readOnly
              />
              <FaSearch
                size={18}
                className="text-secondary ms-2"
                style={{ cursor: "pointer" }}
                onClick={() => setShowMemberModal(true)}
              />
            </div>

            {/* ✅ 유효 여부 필터 드롭다운 */}
            <div className="d-flex align-items-center flex-shrink-0">
              <span className="me-2 fw-semibold">유효 여부</span>
              <select
                className="form-select"
                style={{ width: "120px" }}
                value={voucherFilters.validityFilter}
                onChange={(e) =>
                  handleVoucherFilterChange("validityFilter", e.target.value)
                }
              >
                <option value="전체">전체</option>
                <option value="유효">유효</option>
                <option value="만료">만료</option>
              </select>
            </div>
          </div>

          {/* 초기화 버튼 */}
          <div className="d-flex justify-content-end mt-4 mb-3">
            <button
              className="btn btn-outline-dark d-flex align-items-center"
              style={{ height: "38px" }}
              onClick={resetVoucherFilters}
            >
              <i className="bi bi-arrow-counterclockwise me-1" />
              초기화
            </button>
          </div>

          {/* 테이블 */}
          <div
            ref={tableRef}
            style={{
              maxHeight: "520px",
              overflowY: "auto",
              overflowX: "hidden",
              border: "1px solid #dee2e6",
              borderRadius: "6px",
            }}
          >
            <table
              className="table text-center align-middle mb-0"
              style={{ tableLayout: "fixed", width: "100%" }}
            >
              <thead className="table-dark">
                <tr>
                  <th style={{ width: "25%" }}>회원명</th>
                  <th style={{ width: "25%" }}>시작일</th>
                  <th style={{ width: "25%" }}>종료일</th>
                  <th style={{ width: "25%" }}>유효여부</th>
                </tr>
              </thead>
              <tbody>
                {voucherLoading ? (
                  <tr>
                    <td colSpan="4" className="p-4 text-center">
                      로딩중...
                    </td>
                  </tr>
                ) : voucherList.length > 0 ? (
                  voucherList.map((v) => {
                    const isSelected =
                      Number(selectedRow) === Number(v.voucherId);
                    return (
                      <tr key={v.voucherId}>
                        <td colSpan="4" style={{ padding: 0 }}>
                          <div
                            onClick={() => handleRowClick(v.voucherId)}
                            className="d-flex text-center"
                            style={{
                              cursor: "pointer",
                              backgroundColor: isSelected
                                ? "#d9ffae"
                                : "transparent",
                              transition: "background-color 0.2s ease-in-out",
                              padding: "8px 0",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected)
                                e.currentTarget.style.backgroundColor =
                                  "#f5f6f7";
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected)
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                            }}
                          >
                            <div style={{ width: "25%" }}>{v.memberName}</div>
                            <div style={{ width: "25%" }}>{v.startDate}</div>
                            <div style={{ width: "25%" }}>{v.endDate}</div>
                            <div
                              style={{
                                width: "25%",
                                color: v.validity === "유효" ? "black" : "red",
                                fontWeight:
                                  v.validity === "만료" ? "bold" : "normal",
                              }}
                            >
                              {v.validity === "유효" ? "유효" : "만료"}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center p-4 text-muted">
                      회원권 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 하단 페이징 */}
          <div className="d-flex justify-content-center mt-4 mb-5">
            <Pagination
              page={voucherPage}
              totalPage={voucherTotalPage}
              onPageChange={setVoucherPage}
            />
          </div>

          {/* 회원 모달 */}
          <MemberSearchModal
            show={showMemberModal}
            onHide={() => setShowMemberModal(false)}
            onSelect={handleSelectMemberVoucher}
          />
        </div>
      </main>
    </div>
  );
}

export default SalesVoucherList;
