// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import "../components/css/dashboard.css";
import { fetchDashboardKpis } from "../api/dashboard";
import { fmtInt, fmtKRW } from "../utils/numfmt";

import TotalSalesChart from "../components/graph/TotalSalesChart";
import TrainerPerformanceChart from "../components/graph/TrainerPerformanceChart";
import AiMemberPredictionChart from "../components/graph/AiMemberPredictionChart";
import AiSalesPredictionChart from "../components/graph/AiSalesPredictionChart";
import MemberVoucherPtStatusChart from "../components/graph/MemberVoucherPtStatusChart";

export default function Home() {
  const [kpi, setKpi] = useState({
    activeMembers: 0,
    monthNewMembers: 0,
    mtdRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

useEffect(() => {
  (async () => {
    try {
      const kRaw = await fetchDashboardKpis();
      
      // kRaw 객체의 속성 하나하나를 강제로 로그 찍어보기
      console.log("Raw activeMembers value:", kRaw.activeMembers, typeof kRaw.activeMembers);
      
      const k = {
        // Number() 대신 parseInt()를 사용해 명확하게 정수 변환 시도
        activeMembers: parseInt(kRaw.activeMembers, 10),
        monthNewMembers: parseInt(kRaw.monthNewMembers, 10),
        mtdRevenue: Number(kRaw.mtdRevenue)
      };
      
      // 변환된 k 객체의 속성 하나하나를 강제로 로그 찍어보기
      console.log("Processed activeMembers value:", k.activeMembers, typeof k.activeMembers);

      setKpi(k);
    } catch (e) {
      console.error("[KPI FAIL]", e?.response?.status, e?.response?.data || e.message);
      setError(e?.response?.status || e?.message || "unknown");
    } finally {
      setLoading(false);
    }
  })();
}, []);


  const cards = [
    { label: "회원권 사용중",   value: loading ? "…" : (error ? "-" : fmtInt(kpi.activeMembers)),  icon: "👥" },
    { label: "월 신규 가입", value: loading ? "…" : (error ? "-" : fmtInt(kpi.monthNewMembers)), icon: "✨" },
    { label: "월 매출",    value: loading ? "…" : (error ? "-" : fmtKRW(kpi.mtdRevenue)),      icon: "₩" },
  ];

  return (
    <div className="app-bg">
      <div className="container-xxl p-4">
        {/* 에러 뱃지 */}
        {error && (
          <div className="alert alert-warning py-2 mb-3">
            KPI 로드 실패: {String(error)} (DevTools Network 탭 확인)
          </div>
        )}

        {/* KPI Row */}
        <div className="row g-3 mb-3">
          {cards.map((c,i)=>(
            <div className="col-12 col-md-4" key={i}>
              <div className="glass soft-shadow kpi">
                <div className="icon">{c.icon}</div>
                <div>
                  <div className="label">{c.label}</div>
                  <div className="value">{c.value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 이하 동일 */}
        
        <div className="row row-cols-1 row-cols-xl-2 g-4">
          <div className="col">
            <div className="glass soft-shadow">
              <div className="card-body dashboard-sizer ai-tall">
                <AiMemberPredictionChart />
              </div>
            </div>
          </div>

          <div className="col">
            <div className="glass soft-shadow">
              <div className="card-body dashboard-sizer ai-tall" >
                <MemberVoucherPtStatusChart />
                
              </div>
            </div>
          </div>


          <div className="col">
            <div className="glass soft-shadow">
              <div className="card-body dashboard-sizer" style={{ height: "460px" }}>
                <TotalSalesChart />
              </div>
            </div>
          </div>

          <div className="col">
            <div className="glass soft-shadow">
              <div className="card-body dashboard-sizer" style={{ height: "460px" }}>
                <TrainerPerformanceChart />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
