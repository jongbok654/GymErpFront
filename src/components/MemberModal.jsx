import axios from "axios";
import { useState } from "react";
import { Modal, Button, Form, InputGroup } from "react-bootstrap";

function MemberModal({ show, onClose, onSuccess }) {
  const [form, setForm] = useState({
    memName: "",
    memGender: "",
    memBirthday: "",
    memPhone: "",
    memEmail: "",
    memAddr: "",
    memNote: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!form.memName || !form.memGender || !form.memBirthday || !form.memPhone || !form.memEmail) {
      alert("필수 항목(이름/성별/생년월일/연락처/이메일)을 모두 입력해주세요.");
      return;
    }
    try {

      await axios.post("/v1/member", form);
      alert("회원이 등록되었습니다.");
      onClose?.();
      onSuccess?.();
    } catch (err) {
      console.error(err);
      alert("등록 실패");
    }
  };

  // ---- 주소찾기(카카오 우편번호) ----
  const loadPostcodeScript = () =>
    new Promise((resolve, reject) => {
      if (window.daum?.Postcode) return resolve();
      const script = document.createElement("script");
      script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.onload = () => resolve();
      script.onerror = reject;
      document.body.appendChild(script);
    });

  const openAddressSearch = async () => {
    try {
      await loadPostcodeScript();
      new window.daum.Postcode({
        oncomplete: (data) => {
          const address = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
          setForm((prev) => ({ ...prev, memAddr: address }));
        },
        width: 500,
        height: 550,
      }).open();
    } catch (e) {
      console.error("주소검색 로드 실패:", e);
      alert("주소 검색을 불러오지 못했습니다.");
    }
  };
  // -----------------------------------

  return (
    <Modal show={show} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>신규 회원 등록</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>이름 *</Form.Label>
            <Form.Control name="memName" value={form.memName} onChange={handleChange} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>성별 *</Form.Label><br />
            <Form.Check inline label="남" name="memGender" type="radio" value="남" onChange={handleChange} />
            <Form.Check inline label="여" name="memGender" type="radio" value="여" onChange={handleChange} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>생년월일 *</Form.Label>
            <Form.Control type="date" name="memBirthday" value={form.memBirthday} onChange={handleChange} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>연락처 *</Form.Label>
            <Form.Control name="memPhone" value={form.memPhone} onChange={handleChange} placeholder="010-1234-5678" />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>이메일 *</Form.Label>
            <Form.Control type="email" name="memEmail" value={form.memEmail} onChange={handleChange} />
          </Form.Group>

          {/* 주소 + 작은 '주소찾기' 버튼 */}
          <Form.Group className="mb-3">
            <Form.Label>주소</Form.Label>
            <InputGroup style={{ maxWidth: "720px" }}>
              <Form.Control
                name="memAddr"
                value={form.memAddr}
                onChange={handleChange}
                placeholder="주소"
              />
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={openAddressSearch}
                style={{
                  fontSize: "0.8rem",
                  whiteSpace: "nowrap",
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  padding: "3px 10px",
                }}
              >
                주소찾기
              </Button>
            </InputGroup>
          </Form.Group>

          <Form.Group className="mb-0">
            <Form.Label>메모</Form.Label>
            <Form.Control as="textarea" rows={3} name="memNote" value={form.memNote} onChange={handleChange} />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>취소</Button>
        <Button variant="success" onClick={handleSubmit}>저장</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default MemberModal;
