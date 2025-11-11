// src/components/Graph/AiMemberPredictionChart.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
} from "recharts";
import ChartWrapper from "./ChartWrapper";

function AiMemberPredictionChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ===============================
     1. 데이터 조회 (AI 회원 예측)
  =============================== */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/v1/analytics/ai/members");
        setData(res.data || []);
      } catch (err) {
        console.error("AI 회원 예측 데이터 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  /* ===============================
     2. 로딩 / 데이터 없음 처리
  =============================== */
  if (loading)
    return (
      <ChartWrapper title="연말 회원수 예측 그래프">
        <div className="text-center text-secondary">데이터를 불러오는 중입니다</div>
      </ChartWrapper>
    );

  if (!data || data.length === 0)
    return (
      <ChartWrapper title="연말 회원수 예측 그래프">
        <div className="text-center text-muted">표시할 데이터가 없습니다</div>
      </ChartWrapper>
    );

  /* ===============================
     3. 데이터 가공 (월 보정 및 정렬)
  =============================== */
  const processedData = data
    .map((d) => {
      const rawMonth = d.month || d.MONTH || "";
      const dataType = d.data_type || d.DATA_TYPE || "";
      let adjustedMonth = rawMonth;

      // 예측 데이터는 한 달 전으로 보정
      if (dataType === "예측") {
        const dateObj = new Date(rawMonth + "-01");
        dateObj.setMonth(dateObj.getMonth() - 1);
        adjustedMonth = `${dateObj.getFullYear()}-${String(
          dateObj.getMonth() + 1
        ).padStart(2, "0")}`;
      }

      return {
        month: adjustedMonth,
        predictedCount: d.predictedCount || d.PREDICTEDCOUNT,
        type: dataType,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  /* ===============================
     4. 렌더링
  =============================== */
  return (
    <ChartWrapper title="연말 신규 회원수 예측">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={processedData}>
          {/* (1) 격자선 */}
          <CartesianGrid strokeDasharray="3 3" />

          {/* (2) X축 / Y축 */}
          <XAxis
            dataKey="month"
            tickFormatter={(v) => `${parseInt(v.split("-")[1])}월`}
          />
          <YAxis />

          {/* (3) 툴팁 */}
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const info = payload[0].payload;
                const title =
                  info.type === "예측" ? "예측 회원수" : "실제 회원수";
                return (
                  <div
                    style={{
                      backgroundColor: "white",
                      border: "1px solid #ccc",
                      padding: "5px 10px",
                      borderRadius: "5px",
                    }}
                  >
                    <strong>{label}</strong>
                    <br />
                    {title}: {info.predictedCount?.toLocaleString()}명
                  </div>
                );
              }
              return null;
            }}
          />

          {/* (4) 막대그래프 */}
          <Bar dataKey="predictedCount">
            {/* (4-1) 각 막대 위 회원수 표시 */}
            <LabelList
              dataKey="predictedCount"
              position="top"
              formatter={(v) => `${v.toLocaleString()}명`}
              style={{
                fontSize: "12px",
                fill: "#333",
                fontWeight: "600",
              }}
            />

            {/* (4-2) 막대 색상 처리 (예측월 강조) */}
            {processedData.map((d, idx) => {
              const color =
                d.month.includes("2025-11") || d.month.includes("2025-12")
                  ? "#FF4C4C"
                  : "#0088FE";
              return <Cell key={`cell-${idx}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

export default AiMemberPredictionChart;
