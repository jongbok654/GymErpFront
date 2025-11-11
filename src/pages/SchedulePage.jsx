// src/pages/SchedulePage.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { format, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import ScheduleCalendar from "../components/ScheduleCalendar";
import ScheduleModal from "../components/ScheduleModal";
import ScheduleOpenModal from "../components/ScheduleOpenModal";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../components/css/SchedulePage.css";

/* ========= 공통 유틸 ========= */
const safeJson = (s) => {
  try { return JSON.parse(s); } catch { return null; }
};

// 공통 매핑 함수 (일정 → 캘린더 이벤트)
const typeMap = {
  PT: "PT",
  "SCHEDULE-PT": "PT",
  VACATION: "휴가",
  "ETC-COUNSEL": "상담",
  "ETC-MEETING": "회의",
  "ETC-COMPETITION": "대회",
};
const codeColor = (codeBid) =>
  codeBid === "PT" || codeBid === "SCHEDULE-PT" ? "#2ecc71"
  : codeBid === "VACATION" ? "#e74c3c"
  : codeBid === "ETC-COMPETITION" ? "#9b59b6"
  : codeBid === "ETC-COUNSEL" ? "#f39c12"
  : codeBid === "ETC-MEETING" ? "#34495e"
  : "#95a5a6";
 
 // 범례 정의
const legendItems = [
  { key: "PT",              label: "PT",   color: codeColor("PT") },
  { key: "VACATION",        label: "휴가",  color: codeColor("VACATION") },
  { key: "ETC-COUNSEL",     label: "상담",  color: codeColor("ETC-COUNSEL") },
  { key: "ETC-MEETING",     label: "회의",  color: codeColor("ETC-MEETING") },
  { key: "ETC-COMPETITION", label: "대회",  color: codeColor("ETC-COMPETITION") },
];


function mapToEvents(list = []) {
  return list.map((e) => {
    const label = typeMap[e.codeBid] || e.codeBName || "일정";
    return {
      title: label === "PT"
        ? `[${label}] ${e.memName || "회원"} - ${e.memo || ""}`
        : `[${label}] ${e.empName || ""} - ${e.memo || ""}`,
      start: new Date(e.startTime),
      end: new Date(e.endTime),
      color: codeColor(e.codeBid),
      ...e,
    };
  });
}

// 저장소에서 역할 뽑기
function readRoleFromStorage() {
  const candidates = [
    localStorage.getItem("loginUser"),
    sessionStorage.getItem("loginUser"),
    localStorage.getItem("user"),
    sessionStorage.getItem("user"),
    localStorage.getItem("emp"),
    sessionStorage.getItem("emp"),
  ].filter(Boolean);

  for (const c of candidates) {
    const obj = safeJson(c);
    if (!obj) continue;

    if (obj.role) return String(obj.role).toUpperCase();
    if (Array.isArray(obj.roles) && obj.roles.length) {
      const found = obj.roles.map((x) => String(x).toUpperCase()).find((x) => x.includes("ADMIN"));
      if (found) return found;
    }
    if (Array.isArray(obj.authorities) && obj.authorities.length) {
      const toStr = (x) => (typeof x === "string" ? x : x?.authority ?? "");
      const found = obj.authorities.map(toStr).map((s) => s.toUpperCase()).find((x) => x.includes("ADMIN"));
      if (found) return found;
    }
  }
  const direct = (localStorage.getItem("role") || sessionStorage.getItem("role") || "").toUpperCase();
  return direct || "";
}
const isAdminRole = (r) => (r || "").toUpperCase().includes("ADMIN");

/* ========= 페이지 ========= */
export default function SchedulePage() {
  const [events, setEvents] = useState([]);
  const [focusDate, setFocusDate] = useState(null);
  const [formMode, setFormMode] = useState("create"); // 'create' | 'view' | 'edit'
  const [showModal, setShowModal] = useState(false);   // 등록/수정 모달 표시
  const [modalKey, setModalKey] = useState(0);         // 강제 리마운트 키

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editData, setEditData] = useState(null);
  const [clickedDate, setClickedDate] = useState(null);

  // 일정 목록 모달 상태 + 대기 편집 데이터
  const [showListModal, setShowListModal] = useState(false);
  const [listDate, setListDate] = useState(null);
  const [pendingEdit, setPendingEdit] = useState(null);

  // URL 파라미터에서 empNum/empName 받기
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const empNumFromUrl = params.get("empNum");
  const empNameFromUrl = params.get("empName");
  const storedUser = safeJson(sessionStorage.getItem("user"));
  const empNum = empNumFromUrl || storedUser?.empNum || null;
  const empName = empNameFromUrl || storedUser?.empName || null;

  const roleStr = readRoleFromStorage();
  const isAdmin = isAdminRole(roleStr);

  /* ============================================ */
  /** 일정 로딩 */
  const loadSchedules = useCallback(async () => {
    try {
      const url = empNum
        ? `/v1/schedule/emp/${empNum}`
        : "/v1/schedule/all";
      const { data } = await axios.get(url);
      setEvents(mapToEvents(data || []));
    } catch (err) {
      console.error("[일정 불러오기 실패]:", err);
    }
  }, [empNum]);

  // 최초 & empNum 변경 시 로딩
  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  /* ============================================ */
  /** 관리자 검색 (직원이름, 유형, 키워드만) */
  const searchAdmin = async ({ empName, codeBid, keyword }) => {
    if (!isAdmin) return;
    const params = { page: 1, size: 20 };

    const kw = (empName || keyword || "").trim();
    if (kw) params.keyword = kw;
    if (codeBid) params.codeBid = codeBid;


    const { data } = await axios.get(`/v1/schedules/search`, { params });

    const list = data?.list || [];
    const mapped = mapToEvents(list);
    setEvents(mapped);

    if (list.length > 0) {
      const first = list[0];
      setFocusDate(new Date(first.startTime));
      const next = new URLSearchParams(location.search);
      next.set("empNum", String(first.empNum));
      if (first.empName) next.set("empName", first.empName);
      navigate({ search: `?${next.toString()}` }, { replace: true });
    } else {
      alert("검색 결과가 없습니다.");
    }
  };

  /* ============================================ */
  /** 캘린더 빈 칸 클릭 → 등록 */
  const handleSelectSlot = (slotInfo) => {
    const dateStr = format(slotInfo.start, "yyyy-MM-dd");
    setClickedDate(dateStr);
    setEditData(null);
    setModalKey(Date.now()); // 항상 새 키로 리마운트
    setShowModal(true);      // 표시
  };

  /** 일정 클릭 → 상세 보기 */
  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setShowDetailModal(true);
  };

  // +N 클릭 시 해당 날짜의 목록 모달 열기
  const openListForDate = (dateObj) => {
    setListDate(dateObj);
    setShowListModal(true);
  };

  // 해당 날짜의 이벤트 목록
  const eventsOfThatDay = useMemo(() => {
    if (!listDate) return [];
    return events.filter((ev) => isSameDay(new Date(ev.start), listDate));
  }, [events, listDate]);

  // 목록 모달에서 "편집" → 닫힘 완료 후 등록 모달 열기
  const handleOpenEdit = (evEditData) => {
    setPendingEdit(evEditData);
    setFormMode("view");
    setShowListModal(false); // 목록 모달 닫기 (onExited에서 열림)
  };

  // 상세 보기 → 삭제
  const handleDelete = async (data) => {
    const shNum = data?.shNum ?? editData?.shNum ?? selectedEvent?.shNum;
    if (!shNum) {
      alert("삭제할 일정의 shNum이 없습니다.");
      return;
    }
    if (!window.confirm("정말 이 일정을 삭제하시겠습니까?")) return;

    try {

      await axios.delete(`/v1/schedule/delete/${shNum}`);
      alert("일정이 삭제되었습니다.");
      await loadSchedules();
    } catch (err) {
      console.error("[일정 삭제 실패]:", err);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      if (showDetailModal) setShowDetailModal(false);
      if (showModal) setShowModal(false);
      setSelectedEvent(null);
      setEditData(null);
      setClickedDate(null);
      setFormMode("create");
    }
  };

  // 상세 → 수정 전환
  const handleEdit = () => {
    setShowDetailModal(false);
    setEditData(selectedEvent);
    setClickedDate(format(selectedEvent.start, "yyyy-MM-dd"));
    setModalKey(Date.now()); // 수정 모달도 새 키로
    setShowModal(true);
  };

  /** 등록/수정 모달 닫기 (X/ESC/닫기) */
  const handleCloseEditModal = () => {
    setShowModal(false);
    setEditData(null);
    setClickedDate(null);
    setFormMode("create");
  };

  /** 등록/수정 저장 완료 후: 닫고 새로고침 */
  const handleSaved = async () => {
    setShowModal(false);
    setEditData(null);
    setClickedDate(null);
    setFormMode("create");
    await loadSchedules();
  };

  return (
    <div className="schedule-page">
      {/* 헤더(아이콘 + 현재 날짜) */}
      <div className="d-flex align-items-center gap-2 mb-3 ms-4">

       <span className="icon-badge icon-badge--neo">
        <i className="bi bi-calendar4-event" />
       </span>
        <div className="d-flex flex-column">
          <h4 className="ms-2 mt-2 fw-semibold" style={{ color: "#2b2b2b", fontSize: "1.6rem" }}>일정관리</h4>
          <div className="cal-subtitle ms-2">
            {format(focusDate || new Date(), "yyyy.MM.dd (EEE)", { locale: ko })}
          </div>
        </div>
      </div>
      <hr className="mt-2" />

      {/* 관리자 전용 간단 검색바 */}
      {isAdmin && (
        <>
          <AdminSearchBar onSearch={searchAdmin} isAdmin={isAdmin} />
          <hr className="my-3" />
        </>
      )}

      {/* 캘린더 */}
      <ScheduleCalendar
        events={events}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        isAdmin={isAdmin}
        focusDate={focusDate}
        onShowMore={(eventsInDay, date) => openListForDate(date)}
        legendItems={legendItems}   
      />

      {/* 일정 목록 모달(+N 클릭 시) */}
      <ScheduleOpenModal
        show={showListModal}
        date={listDate}
        events={eventsOfThatDay}
        onClose={() => setShowListModal(false)}
        onEdit={handleOpenEdit}
        onExited={() => {
          if (!pendingEdit) return;
          setEditData(pendingEdit);
          setClickedDate(pendingEdit.startTime?.slice(0, 10) || null);
          setShowModal(true);
          setPendingEdit(null);
        }}
      />

      {/* 등록/수정 모달 — 조건부 렌더링 + 강제 리마운트 키 */}
      {showModal && (
        <ScheduleModal
          key={modalKey}
          show
          empNum={empNum}
          empName={empName}
          editData={editData}
          selectedDate={clickedDate}
          mode={formMode}
          onEdit={() => setFormMode("edit")}
          onDelete={handleDelete}
          onSaved={handleSaved}
          onClose={handleCloseEditModal}
        />
      )}

      {/* 상세 보기 모달 */}
      {showDetailModal && selectedEvent && (
        <ScheduleModal
          show={showDetailModal}
          mode="view"
          defaultTab={
            selectedEvent.codeBid === "VACATION"
              ? "vacation"
              : selectedEvent.codeBid?.startsWith("ETC")
                ? "etc"
                : "pt"
          }
          empNum={selectedEvent.empNum}
          empName={selectedEvent.empName}
          editData={selectedEvent}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </div>
  );
}

/* ========= 관리자 간단 검색바 ========= */
function AdminSearchBar({ onSearch, isAdmin = false }) {
  if (!isAdmin) return null;

  const [empName, setEmpName] = useState("");
  const [codeBid, setCodeBid] = useState("");
  const [keyword, setKeyword] = useState("");

  const submit = (e) => {
    e.preventDefault();
    onSearch?.({ empName: empName.trim(), codeBid, keyword: keyword.trim() });
  };
  const reset = () => {
    setEmpName("");
    setCodeBid("");
    setKeyword("");
    onSearch?.({ empName: "", codeBid: "", keyword: "" });
  };

  return (
    <Form onSubmit={submit} className="mb-3">
      <Row className="gy-2 align-items-end ms-4 ">
        <Col md={3}>
          <Form.Label className="fw-bold">직원이름</Form.Label>
          <Form.Control
            value={empName}
            onChange={(e) => setEmpName(e.target.value)}
            placeholder="직원이름을 입력하세요..."
          />
        </Col>
        <Col md={2}>
          <Form.Label className="fw-bold">유형</Form.Label>
          <Form.Select value={codeBid} onChange={(e) => setCodeBid(e.target.value)}>
            <option value="">전체</option>
            <option value="SCHEDULE-PT">PT</option>
            <option value="VACATION">휴가</option>
            <option value="ETC-MEETING">회의</option>
            <option value="ETC-COUNSEL">상담</option>
            <option value="ETC-COMPETITION">대회</option>
          </Form.Select>
        </Col>
        <Col md={4}>
          <Form.Label className="fw-bold">키워드 검색(메모/회원명)</Form.Label>
          <Form.Control
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="검색어를 입력하세요..."
          />
        </Col>
        <Col md="auto">
          <div className="d-flex gap-2">
            <Button type="submit" className="btn-slate">
              <i className="bi bi-search" />검색
            </Button>

            <Button type="button" className="btn-ghost-gray" onClick={reset}>
              <i className="bi bi-arrow-counterclockwise" />초기화
            </Button>
          </div>
        </Col>
      </Row>
    </Form>
  );
}

