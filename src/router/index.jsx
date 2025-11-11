// src/router/index.jsx

import { createHashRouter } from "react-router-dom";


import App from "../App.jsx";
import ProtectedRoute from "../components/ProtectedRoute.jsx";
import Login from "../pages/Login.jsx";
import Home from "../pages/Home.jsx";
import EmpList from "../pages/EmpList.jsx";
import EmpDetail from "../pages/EmpDetail.jsx";
import EmpEdit from "../pages/EmpEdit.jsx";
import SchedulePage from "../pages/SchedulePage.jsx";


import MembersList from "../pages/Members/MembersList.jsx";


// ✅ 상품/재고 관련
import ProductCreate from "../pages/Product/ProductCreate.jsx";
import SalesItemList from "../pages/Sales/SalesItemList.jsx";
import SalesItemCreate from "../pages/Sales/SalesItemCreate.jsx";
import SalesItemDetail from "../pages/Sales/SalesItemDetail.jsx";
import ProductUpdate from "../pages/Product/ProductUpdate.jsx";
import ProductList from "../pages/Product/ProductList.jsx";
import ProductDetail from "../pages/Product/ProductDetail.jsx";
import StockList from "../pages/Product/StockList.jsx";
import StockInbound from "../pages/Product/StockInbound.jsx";
import StockOutbound from "../pages/Product/StockOutbound.jsx";

// ✅ 판매 관련
import SalesServiceList from "../pages/Sales/SalesServiceList.jsx";
import SalesServiceCreate from "../pages/Sales/SalesServiceCreate.jsx";
import SalesServiceEdit from "../pages/Sales/SalesServiceEdit.jsx";
import SalesServiceDetail from "../pages/Sales/SalesServiceDetail.jsx";
import SalesPtList from "../pages/Sales/SalesPtList.jsx";
import SalesVoucherList from "../pages/Sales/SalesVoucherList.jsx";

// ✅ 게시판 관련
import PostList from "../pages/PostList.jsx";
import PostAdd from "../pages/PostAdd.jsx";
import PostEdit from "../pages/PostEdit.jsx";
import PostView from "../pages/PostView.jsx";
import MemberDetail from "../pages/Members/MemberDetail.jsx";

// ✅ 그래프 테스트
import GraphTest from "../pages/GraphTest.jsx";
import EmpAttendance from "../pages/EmpAttendance.jsx";




const router = createHashRouter([

  // 2) 로그인 (비보호)
  {
    path: "/login",
    element: (
      <div className="container-fluid vh-100 d-flex align-items-center justify-content-center bg-light">
        <Login />
      </div>
    ),
    errorElement: <div>로그인 페이지 에러</div>
  },

  // 3) 메인 앱 (보호)
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    errorElement: <div>Route 에러</div>,
    children: [
      { index: true, element: <Home /> },
      { path: "home", element: <Home /> },

      // 직원 관련
      { path: "emp", element: <EmpList /> },
      { path: "emp/:empNum", element: <EmpDetail /> },
      { path: "emp/edit/:empNum", element: <EmpEdit /> },
      {path:"attendance/my", element:<EmpAttendance />},
      { path: "schedule", element: <SchedulePage /> },

      // 회원
      { path: "member", element: <MembersList /> },

      // 상품
      { path: "product", element: <ProductList /> },
      { path: "product/:itemType/:itemId", element: <ProductDetail /> },
      { path: "product/create", element: <ProductCreate /> },
      { path: "product/edit/:productId", element: <ProductUpdate /> },
      { path: "service/edit/:serviceId", element: <ProductUpdate /> },

      { path: "product/edit/:itemType/:itemId", element: <ProductUpdate /> },

      // 재고
      { path: "stock", element: <StockList /> },
      { path: "stock/inbound", element: <StockInbound /> },
      { path: "stock/inbound/:productId", element: <StockInbound /> },
      { path: "stock/outbound/:productId", element: <StockOutbound /> },

      // 판매 (상품)
      { path: "sales/salesitemlist", element: <SalesItemList /> },
      { path: "sales/salesitemcreate", element: <SalesItemCreate /> },

      // ✅ 판매 (서비스)
      { path: "sales/salesservicelist", element: <SalesServiceList /> },
      { path: "sales/salesservicecreate", element: <SalesServiceCreate /> },

      { path: "sales/salesitemdetail", element: <SalesItemDetail />  },
      { path: "member/:memNum", element: <MemberDetail /> },
      // { path: "member/edit/:memNum", element: <MemberEdit /> },
      { path: "sales/salesserviceedit/:id", element: <SalesServiceEdit /> },
      { path: "sales/salesservicedetail/:id", element: <SalesServiceDetail /> },
      { path: "sales/salesptlist", element: <SalesPtList /> },
      { path: "sales/salesvoucherlist", element: <SalesVoucherList /> },

      // 게시판
      { path: "post", element: <PostList /> },
      { path: "post/new", element: <PostAdd /> },
      { path: "post/edit/:postId", element: <PostEdit /> },
      { path: "post/:postId", element: <PostView /> },

      // ✅ 그래프 테스트
      { path: "graphtest", element: <GraphTest /> },
    ],
  },
]);

export default router;
