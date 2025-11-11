import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

export default function PostEdit({ mode }) {
  const nav = useNavigate();
  const { postId } = useParams();
  const isEdit = mode === "edit";

  const [form, setForm] = useState({
    title: "",
    content: "",
    writerName: "관리자",
    pinned: "N",
  });

  useEffect(() => {
    if (!isEdit || !postId) return;
    axios

      .get(`/v1/post/${postId}`, { params: { inc: false } })
      .then((r) => {
        const v = r.data ?? {};
        setForm({
          title: v.title ?? "",
          content: v.content ?? "",
          writerName: v.writerName ?? "관리자",
          pinned: v.pinned ?? "N",
        });
      })
      .catch(() => alert("불러오기 실패"));
  }, [isEdit, postId]);

  const submit = async () => {
    if (!form.title || !form.content) return alert("제목/내용 필수");
    try {
      if (isEdit) {
        await axios.put(`/v1/post/${postId}`, form);
        nav(`/post/${postId}`);
      } else {
        const r = await axios.post("/v1/post", form);
        const newId = r?.data?.id ?? r?.data;
        nav(`/post/${newId}`);
      }
    } catch (e) {
      console.error(e);
      alert("저장 실패");
    }
  };

  return (
    <div className="d-grid gap-3">
      <h3>{isEdit ? "게시글 수정" : "새 글 작성"}</h3>

      <input
        className="form-control"
        placeholder="제목"
        value={form.title}
        onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
      />

      <textarea
        className="form-control"
        rows={10}
        placeholder="내용"
        value={form.content}
        onChange={(e) => setForm((s) => ({ ...s, content: e.target.value }))}
      />

      <div className="d-flex align-items-center gap-3">
        <input
          className="form-control"
          style={{ maxWidth: 240 }}
          placeholder="작성자"
          value={form.writerName}
          onChange={(e) => setForm((s) => ({ ...s, writerName: e.target.value }))}
        />
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="pinnedCheck"
            checked={form.pinned === "Y"}
            onChange={(e) =>
              setForm((s) => ({ ...s, pinned: e.target.checked ? "Y" : "N" }))
            }
          />
          <label className="form-check-label" htmlFor="pinnedCheck">
            상단고정
          </label>
        </div>
        <button className="btn btn-primary" onClick={submit}>
          {isEdit ? "수정 저장" : "등록"}
        </button>
        <button className="btn btn-outline-secondary" onClick={() => nav(-1)}>
          취소
        </button>
      </div>
    </div>
  );
}