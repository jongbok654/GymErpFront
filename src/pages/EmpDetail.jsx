import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaUserCircle, FaEdit, FaCalendarAlt, FaTrashAlt, FaSave, FaTimes, FaFolderOpen } from "react-icons/fa";
import "../components/css/detail-pane.css";

function EmpDetail({empNum: propEmpNum, onBack}) {
  // url 파라미터도 받지만, props 가 있다면 우선 사용
  const {empNum: paramEmpNum} = useParams();
  const empNum = propEmpNum ?? paramEmpNum;
  
  // 직원 목록 조회 상태값
  const [emp, setEmp] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [preview, setPreview] = useState(null);
  
  // 프로필 사진 상태값
  const [pendingFile, setPendingFile] = useState(null); // 새로 선택한 파일(아직 미업로드)
  const [removeProfile, setRemoveProfile] = useState(false); // 기본 이미지로 복구 플래그


  // 회원 목록조회 상태값
  const [managedMembers, setManagedMembers] = useState([]);
  const [mmLoading, setMmLoading] = useState(false);
  const [mmError, setMmError] = useState(null);

  const navigate = useNavigate();
  const headerGradient = "linear-gradient(135deg, #2b314a, #4c5371)";
  
  // 일정관리 버튼 클릭 시 직원num 과 name 을 파라미터로 전달하며 이동
  // 나중에 로그인 기능 합치면 로그인된 id 로 
  const handleGoSchedule = () => {
    navigate(`/schedule?empNum=${emp.empNum}&empName=${emp.empName}`); 
  };

  // 직원 정보 로드 함수 (선언식: 호이스팅 OK)
  async function loadEmployee() {
    try {
      if (!empNum) return; // empNum이 undefined일 경우 호출하지 않음
      const res = await axios.get(`/v1/emp/${empNum}`);
      setEmp(res.data);
    } catch (e) {
      console.error("직원 상세조회 실패:", e);
    }
  }

  // 회원 목록 로딩 (선언식: 호이스팅 OK)
  async function loadManagedMembers() {
    try {
      if (!empNum) return;
      setMmLoading(true);
      setMmError(null);
      const res = await axios.get(`/v1/emp/${empNum}/members/pt-users`);
      setManagedMembers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("관리 회원 조회 실패:", e);
      setMmError("관리 회원을 불러오지 못했습니다.");
    } finally {
      setMmLoading(false);
    }
  }

  // 직원 & 회원 목록 조회
  useEffect(() => {
    loadEmployee();
    loadManagedMembers();
  }, [empNum]);


  if (!emp)
    return <div className="container mt-5 text-center">직원 정보를 불러오는 중...</div>;

  // 프로필 미리보기 URL 계산 (중첩 삼항 대신 함수로 분리)
  function getProfileUrl() {
    if (removeProfile) return null;                 // ← 삭제 예정이면 아이콘 보이도록
    if (preview) return preview;                    // 새 파일 미리보기
    if (emp?.profileImage) {
      return `/profile/${emp.profileImage}`;
    }
    return null;                                    // DB에 null이면 아이콘 보이도록
  }
  const profileUrl = getProfileUrl();

  // 직원 삭제
  const handleDelete = async () => {
    if (window.confirm(`정말 ${emp.empName} 직원을 삭제하시겠습니까?`)) {
      try {
        await axios.delete(`/v1/emp/${empNum}`);
        alert("직원 정보가 삭제되었습니다.");
        navigate("/emp");
      } catch (error) {
        console.error("직원 삭제 실패:", error);
        alert("직원 삭제에 실패했습니다.");
      }
    }
  };

  // 근속연수 계산
  const calcYears = (hireDate, fireDate) => {
    if (!hireDate) return "-";
    const start = new Date(hireDate);
    const end = fireDate ? new Date(fireDate) : new Date();
    const diff = end.getFullYear() - start.getFullYear();
    const months = end.getMonth() - start.getMonth();
    const total = diff + (months >= 0 ? months / 12 : (12 + months) / 12);
    return `${Math.floor(total)}년 ${Math.floor((total % 1) * 12)}개월`;
  };

  // 입력값 변경
  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmp((prev) => ({ ...prev, [name]: value }));
  };

  // 프로필 이미지 업로드
  const handleProfileSelect = (e) => {
  const file = e.target.files[0];
    if (!file) return;
    setRemoveProfile(false);                 // 새 파일 선택 시 삭제 플래그 해제
    setPendingFile(file);                    // 로컬 보관
    setPreview(URL.createObjectURL(file));   // 미리보기만
    e.target.value="";
  };

  // "사진 삭제" 클릭 (저장 시 반영)
  const handleMarkDelete = () => {
    setPendingFile(null);
    setPreview(null);
    setRemoveProfile(true);
  };

  // 수정 저장
  const handleSave = async () => {
  try {
    if (pendingFile) {
      // 1) 새 파일 선택 → 멀티파트 PUT
      const form = new FormData();
      form.append("emp", new Blob([JSON.stringify({ ...emp, removeProfile: false })], { type: "application/json" }));
      form.append("profileFile", pendingFile);

      await axios.put(`/v1/emp/${empNum}`, form, {
        // boundary는 브라우저가 설정하므로 Content-Type 생략
      });
    } else if (removeProfile) {
      // 2) 파일 변경 X + 삭제만 → JSON PUT
      await axios.put(`/v1/emp/${empNum}`, { ...emp, profileImage: null, removeProfile: true });
    } else {
      // 3) 일반 수정 → JSON PUT
      await axios.put(`/v1/emp/${empNum}`, { ...emp, removeProfile: false });

    }
      alert("직원 정보가 수정되었습니다.");
      setIsEditMode(false);
      setPendingFile(null);
      setRemoveProfile(false);
      setPreview(null);
      await loadEmployee();
    } catch (e) {
      console.error(e);
      alert("직원 수정에 실패했습니다.");
    }
  };


  // 회원 목록 조회 시 호출할 함수
  const fmtDate = (v) => {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v).slice(0, 10); // 문자열 날짜 대응
    return d.toLocaleDateString("ko-KR");
  };

  return (
    <div className="min-vh-100 py-5">
      <div className="container" style={{ maxWidth: "950px" }}>
        <div className="card border-0 rounded-4 shadow overflow-hidden">
          {/* 상단 헤더 */}
        <div
          className="p-4 text-white d-flex justify-content-between align-items-center position-relative"
          style={{ background: headerGradient, minHeight: "200px", padding: "2rem" }}
        >
          {/* 왼쪽: 프로필 + 이름 */}
          <div className="d-flex align-items-center gap-3" style={{ marginTop: "-10px" }}>
            {/* 프로필 이미지 + 업로드/되돌리기 버튼 */}
            <div
              className="position-relative"
              style={{
                width: "110px",
                height: "110px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {profileUrl ? (
                <img
                  src={profileUrl}
                  alt="프로필"
                  className="rounded-circle border border-white shadow"
                  width="100"
                  height="100"
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <FaUserCircle size={100} color="white" />
              )}

              {/* 업로드 + 기본이미지 버튼 묶음 (같은 흰색 버튼) */}
              {isEditMode && (
                <div
                  className="d-flex align-items-center gap-2 position-absolute"
                  style={{
                    bottom: "0px",
                    left: "50%",
                    transform: "translate(-30%, 110%)",
                    height: 30,
                    zIndex: 2,
                  }}
                >
                  {/* 업로드 버튼 */}
                  <label
                    htmlFor="fileUpload"
                    className="btn btn-light btn-sm border shadow-sm px-2"
                    style={{ borderRadius: 6, fontSize: "0.85rem", lineHeight: 1, whiteSpace: "nowrap" }}
                    title="사진 업로드"
                  >
                    <FaFolderOpen className="me-1" />
                    사진 업로드
                  </label>
                  <input
                    id="fileUpload"
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleProfileSelect}
                  />
                  <button type="button"
                          className="btn btn-light btn-sm border shadow-sm px-2"
                          style={{ borderRadius: 6, fontSize: "0.85rem", lineHeight: 1, whiteSpace: "nowrap" }}
                          onClick={handleMarkDelete}
                          disabled={!emp.profileImage && !pendingFile}>
                    사진 삭제
                  </button>
                </div>
              )}
            </div>

            {/* 이름 / 이메일 */}
            <div className="ms-3">
              {isEditMode ? (
                <input
                  type="text"
                  name="empName"
                  value={emp.empName || ""}
                  onChange={handleChange}
                  className="form-control fw-bold"
                  style={{ fontSize: "1.5rem" }}
                />
              ) : (
                <h3 className="fw-bold mb-1">{emp.empName}</h3>
              )}
              <small className="opacity-75">
                {emp.gender || "성별 미상"} / {emp.empEmail || "-"}
              </small>
            </div>
          </div>

          {/* 오른쪽 버튼 그룹 */}
          <div className="d-flex gap-2">
            {isEditMode ? (
              <>
                <button
                  onClick={handleSave}
                  className="btn btn-success btn-sm d-flex align-items-center gap-1 shadow-sm"
                >
                  <FaSave /> 저장
                </button>
                <button
                  onClick={() => {
                    setIsEditMode(false);
                    setPreview(null);
                    setPendingFile(null);
                    setRemoveProfile(false);
                  }}
                  className="btn btn-secondary btn-sm d-flex align-items-center gap-1 shadow-sm"
                >
                  <FaTimes /> 취소
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditMode(true)}
                  className="btn btn-light btn-sm d-flex align-items-center gap-1 shadow-sm"
                >
                  <FaEdit /> 상세정보 수정
                </button>
                <button
                  onClick={handleGoSchedule}
                  className="btn btn-light btn-sm d-flex align-items-center gap-1 shadow-sm"
                >
                  <FaCalendarAlt /> 일정 관리
                </button>
                <button
                  onClick={handleDelete}
                  className="btn btn-danger btn-sm d-flex align-items-center gap-1 shadow-sm"
                >
                  <FaTrashAlt /> 직원 삭제
                </button>
              </>
            )}
          </div>
        </div>

          {/* 내용 영역 */}
          <div className="p-4 bg-white">
            {/* 기본 정보 */}
            <section
              className="mb-4 p-3 rounded-3"
              style={{ backgroundColor: "#eef3ff" }}
            >
              <h5 className="fw-semibold mb-3">기본 정보</h5>
              <table className="table table-borderless align-middle text-secondary mb-0">
                <tbody>
                  <tr>
                    <th style={{ width: "130px" }}>주소</th>
                    <td>
                      {isEditMode ? (
                        <input
                          type="text"
                          name="empAddress"
                          value={emp.empAddress || ""}
                          onChange={handleChange}
                          className="form-control"
                        />
                      ) : (
                        emp.empAddress || "-"
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>생년월일</th>
                    <td>
                      {isEditMode ? (
                        <input
                          type="date"
                          name="empBirth"
                          value={emp.empBirth || ""}
                          onChange={handleChange}
                          className="form-control"
                        />
                      ) : (
                        emp.empBirth || "-"
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>연락처</th>
                    <td>
                      {isEditMode ? (
                        <input
                          type="text"
                          name="empPhone"
                          value={emp.empPhone || ""}
                          onChange={handleChange}
                          className="form-control"
                        />
                      ) : (
                        emp.empPhone || "-"
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>이메일</th>
                    <td>
                      {isEditMode ? (
                        <input
                          type="email"
                          name="empEmail"
                          value={emp.empEmail || ""}
                          onChange={handleChange}
                          className="form-control"
                        />
                      ) : (
                        emp.empEmail || "-"
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* 인사 정보 */}
            <section
              className="mb-4 p-3 rounded-3"
              style={{ backgroundColor: "#eef3ff" }}
            >
              <h5 className="fw-semibold mb-3">인사 정보</h5>
              <table className="table table-borderless align-middle text-secondary mb-2">
                <tbody>
                  <tr>
                    <th style={{ width: "130px" }}>입사일</th>
                    <td>
                      {isEditMode ? (
                        <input
                          type="date"
                          name="hireDate"
                          value={emp.hireDate || ""}
                          onChange={handleChange}
                          className="form-control"
                        />
                      ) : (
                        emp.hireDate || "-"
                      )}
                    </td>
                    <th style={{ width: "130px" }}>퇴사일</th>
                    <td>
                      {isEditMode ? (
                        <input
                          type="date"
                          name="fireDate"
                          value={emp.fireDate || ""}
                          onChange={handleChange}
                          className="form-control"
                        />
                      ) : (
                        emp.fireDate || "-"
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th>근속연수</th>
                    <td colSpan="3">
                      {calcYears(emp.hireDate, emp.fireDate)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div>
                <br />
                <h5 className="form-label medium fw-semibold">메모</h5>
                {isEditMode ? (
                  <textarea
                    name="empMemo"
                    value={emp.empMemo || ""}
                    onChange={handleChange}
                    className="form-control"
                    rows="3"
                  ></textarea>
                ) : (
                  <div
                    className="p-3 rounded-3 border"
                    style={{ backgroundColor: "#f9fbff", minHeight: "80px" }}
                  >
                    {emp.empMemo ? emp.empMemo : "등록된 메모가 없습니다."}
                  </div>
                )}
              </div>
            </section>

            {/* 회원 정보 */}
            <section className="p-3 rounded-3" style={{ backgroundColor: "#eef3ff" }}>
              <h5 className="fw-semibold mb-3">회원 정보</h5>
              {mmLoading && <p className="text-muted mb-0">불러오는 중…</p>}
              {mmError && <p className="text-danger mb-0">{mmError}</p>}

              {!mmLoading && !mmError && managedMembers.length === 0 && (
                <p className="text-muted mb-0">등록된 회원정보가 없습니다.</p>
              )}

              {!mmLoading && !mmError && managedMembers.length > 0 && (
                <div className="list-group">
                  {managedMembers.map((m) => (
                    <div key={m.memNum} className="list-group-item d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-semibold">
                          {m.memName}{" "}
                          <span className="text-muted small">{m.memPhone || "-"}</span>
                        </div>
                        <div className="text-muted small">
                          {m.memEmail || "-"} · 마지막 사용: {fmtDate(m.lastUseAt)}
                        </div>
                      </div>
                      <div className="text-nowrap">
                        <span className="badge bg-success me-2">잔여 PT {m.ptRemain ?? 0}</span>
                        <span className="badge bg-secondary">사용 {m.usedCount ?? 0}회</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmpDetail;
