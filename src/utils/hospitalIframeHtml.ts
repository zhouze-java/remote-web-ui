import { HospitalBusinessState, HospitalNode, SandboxSession } from '../types/sandbox';

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildHospitalIframeSrcDoc(
  session: SandboxSession,
  hospital: HospitalNode,
  state: HospitalBusinessState
): string {
  const seed = hospital.businessSeed;
  const factor = state.period === 'month' ? 1 : 0.86;
  const inbound = (seed.inboundAmountWan * factor).toFixed(2);
  const outbound = (seed.outboundAmountWan * factor).toFixed(2);
  const inventory = (seed.inventoryAmountWan * (state.period === 'month' ? 1 : 0.94)).toFixed(2);

  const filteredRows = seed.rows.filter((row) => {
    const matchBucket = state.expiryBucket === '12m' ? true : row.bucket === state.expiryBucket;
    const kw = state.searchKeyword.trim().toLowerCase();
    const matchKw =
      !kw ||
      row.materialName.toLowerCase().includes(kw) ||
      row.supplier.toLowerCase().includes(kw) ||
      row.batchNo.toLowerCase().includes(kw);
    return matchBucket && matchKw;
  });

  const navItems = [
    '设备中心库',
    '基础数据',
    '订单管理',
    '库房管理',
    '财务管理',
    '质量管理',
    'BI',
    '智廉监控',
  ];

  const bucketTabs: Array<{ key: HospitalBusinessState['expiryBucket']; label: string; count: number }> = [
    { key: '12m', label: '12个月内过期', count: seed.expiryCounts['12m'] },
    { key: '6m', label: '6个月内过期', count: seed.expiryCounts['6m'] },
    { key: '3m', label: '3个月内过期', count: seed.expiryCounts['3m'] },
    { key: '1m', label: '1个月内过期', count: seed.expiryCounts['1m'] },
    { key: 'expired', label: '已过期', count: seed.expiryCounts.expired },
  ];

  const sessionJson = JSON.stringify(session.id);

  if (!state.isHospitalLoggedIn) {
    return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
    background: #f1f5f9;
    color: #0f172a;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .banner {
    background: #334e7b;
    color: #fff;
    padding: 12px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
  }
  .banner-title { font-weight: 600; font-size: 15px; }
  .banner-meta { opacity: 0.85; font-family: monospace; font-size: 12px; }
  .main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .card {
    width: 100%;
    max-width: 400px;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 28px;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
  }
  .sys-name {
    font-size: 18px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 6px;
  }
  .sys-desc {
    font-size: 12px;
    color: #64748b;
    line-height: 1.5;
    margin-bottom: 20px;
    padding-bottom: 14px;
    border-bottom: 1px solid #e2e8f0;
  }
  .field { margin-bottom: 14px; }
  .field label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 6px;
  }
  .field input {
    width: 100%;
    height: 38px;
    padding: 0 12px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 13px;
    color: #0f172a;
    outline: none;
  }
  .field input:focus { border-color: #2563eb; }
  .btn {
    width: 100%;
    height: 40px;
    background: #2f54eb;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 6px;
  }
  .btn:hover { background: #1d39c4; }
  .note {
    margin-top: 16px;
    padding: 10px 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 12px;
    color: #475569;
    line-height: 1.5;
  }
  .mono { font-family: monospace; color: #0f172a; font-weight: 600; }
</style>
</head>
<body>
  <div class="banner">
    <div class="banner-title">${escapeHtml(hospital.systemTitle)}</div>
    <div class="banner-meta">${escapeHtml(hospital.mqRoute)}</div>
  </div>
  <div class="main">
    <form class="card" id="hisLoginForm">
      <div class="sys-name">院内业务系统登录</div>
      <div class="sys-desc">当前运行于隔离沙箱前端中，登录后请求将通过消息队列转发至真实院内后端。</div>
      <div class="field">
        <label for="hisUser">院内工号 / 账号</label>
        <input id="hisUser" type="text" value="${escapeHtml(seed.defaultHisAccount)}" required />
      </div>
      <div class="field">
        <label for="hisPass">业务系统密码</label>
        <input id="hisPass" type="password" value="his123456" required />
      </div>
      <button type="submit" class="btn">登录院内业务系统</button>
      <div class="note">
        Cookie 隔离域：<span class="mono">${escapeHtml(session.cookieNamespace)}</span><br/>
        不同沙箱会话之间的院内账号登录态完全隔离，互不串号。
      </div>
    </form>
  </div>
  <script>
    const sid = ${sessionJson};
    document.addEventListener('click', () => {
      window.parent.postMessage({ type: 'HOSPITAL_ACTIVITY', sessionId: sid }, '*');
    });
    document.getElementById('hisLoginForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const username = document.getElementById('hisUser').value.trim() || '${escapeHtml(seed.defaultHisAccount)}';
      window.parent.postMessage({ type: 'HOSPITAL_LOGIN', sessionId: sid, username }, '*');
    });
  </script>
</body>
</html>`;
  }

  const rowsHtml = filteredRows.length
    ? filteredRows
        .map(
          (r) => `
      <tr>
        <td class="num">${r.id}</td>
        <td class="bold">${escapeHtml(r.materialName)}</td>
        <td>${escapeHtml(r.spec)}</td>
        <td class="num">${escapeHtml(r.unitPrice)}</td>
        <td class="num">${r.alertQty.toLocaleString()}</td>
        <td class="num">${escapeHtml(r.amount)}</td>
        <td class="mono">${escapeHtml(r.batchNo)}</td>
        <td class="mono">${escapeHtml(r.expiryDate)}</td>
        <td>${escapeHtml(r.supplier)}</td>
        <td>${escapeHtml(r.manufacturer)}</td>
      </tr>`
        )
        .join('')
    : `<tr><td colspan="10" class="empty">当前筛选条件下暂无效期预警物资记录</td></tr>`;

  const navHtml = navItems
    .map(
      (item) =>
        `<button type="button" class="nav-item ${state.activeNav === item ? 'active' : ''}" data-nav="${escapeHtml(
          item
        )}">${escapeHtml(item)}</button>`
    )
    .join('');

  const tabsHtml = bucketTabs
    .map(
      (t) =>
        `<button type="button" class="tab-btn ${state.expiryBucket === t.key ? 'active' : ''}" data-bucket="${
          t.key
        }">${escapeHtml(t.label)}(${t.count})</button>`
    )
    .join('');

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
    background: #f4f6f9;
    color: #1f2937;
    font-size: 13px;
    min-height: 100vh;
  }
  .topbar {
    height: 46px;
    background: #3b537e;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 18px;
  }
  .topbar-left {
    display: flex;
    align-items: center;
    gap: 18px;
    overflow-x: auto;
  }
  .hosp-brand {
    font-weight: 700;
    font-size: 14px;
    white-space: nowrap;
  }
  .nav-list {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .nav-item {
    background: transparent;
    border: none;
    color: rgba(255,255,255,0.85);
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
  }
  .nav-item:hover { background: rgba(255,255,255,0.12); color: #fff; }
  .nav-item.active { background: rgba(255,255,255,0.22); color: #fff; font-weight: 600; }
  .topbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    white-space: nowrap;
  }
  .logout-btn {
    background: rgba(255,255,255,0.14);
    border: 1px solid rgba(255,255,255,0.25);
    color: #fff;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
  }
  .logout-btn:hover { background: rgba(255,255,255,0.25); }
  .layout {
    display: grid;
    grid-template-columns: 1fr 310px;
    gap: 14px;
    padding: 14px;
  }
  @media (max-width: 1024px) {
    .layout { grid-template-columns: 1fr; }
  }
  .panel {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 14px;
  }
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .panel-title {
    font-size: 14px;
    font-weight: 700;
    color: #111827;
  }
  .period-switch {
    display: flex;
    gap: 10px;
  }
  .period-btn {
    background: none;
    border: none;
    font-size: 12px;
    color: #6b7280;
    cursor: pointer;
    padding-bottom: 2px;
  }
  .period-btn.active {
    color: #2563eb;
    font-weight: 600;
    border-bottom: 2px solid #2563eb;
  }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .kpi-card {
    padding: 18px 16px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .kpi-blue { background: #eff6ff; }
  .kpi-green { background: #ecfdf5; }
  .kpi-amber { background: #fff7ed; }
  .kpi-val {
    font-size: 24px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: #111827;
    margin-bottom: 4px;
  }
  .kpi-lbl { font-size: 12px; color: #6b7280; }
  .kpi-icon {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 14px;
    font-weight: 700;
  }
  .tabs-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  .tabs-left { display: flex; gap: 14px; flex-wrap: wrap; }
  .tab-btn {
    background: none;
    border: none;
    padding: 8px 2px;
    font-size: 12px;
    color: #4b5563;
    cursor: pointer;
    border-bottom: 2px solid transparent;
  }
  .tab-btn.active {
    color: #2563eb;
    border-bottom-color: #2563eb;
    font-weight: 600;
  }
  .search-input {
    height: 28px;
    padding: 0 10px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 12px;
    margin-bottom: 6px;
    width: 190px;
  }
  .table-wrap { overflow-x: auto; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  th {
    background: #f9fafb;
    color: #374151;
    font-weight: 600;
    text-align: left;
    padding: 9px 10px;
    border-bottom: 1px solid #e5e7eb;
    white-space: nowrap;
  }
  td {
    padding: 9px 10px;
    border-bottom: 1px solid #f3f4f6;
    color: #374151;
    white-space: nowrap;
  }
  tr:hover td { background: #f8fafc; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .mono { font-family: monospace; font-size: 12px; }
  .bold { font-weight: 600; color: #111827; }
  .empty { text-align: center; padding: 36px 12px; color: #9ca3af; }
  .todo-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    text-align: center;
  }
  .todo-item {
    padding: 10px 4px;
    border-radius: 6px;
    cursor: pointer;
    border: 1px solid transparent;
  }
  .todo-item:hover { background: #f8fafc; border-color: #e5e7eb; }
  .todo-box {
    width: 34px;
    height: 34px;
    margin: 0 auto 6px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-size: 13px;
  }
  .todo-lbl { font-size: 12px; color: #4b5563; }
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px 8px;
    text-align: center;
    padding-top: 6px;
  }
  .stat-num {
    font-size: 20px;
    font-weight: 600;
    color: #2563eb;
    font-variant-numeric: tabular-nums;
  }
  .stat-lbl { font-size: 12px; color: #6b7280; margin-top: 2px; }
  .footer-info {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #4b5563;
    line-height: 1.6;
  }
  .toast {
    position: fixed;
    right: 16px;
    bottom: 16px;
    background: #1e293b;
    color: #fff;
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 12px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
  }
  .toast.show { opacity: 1; }
</style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <div class="hosp-brand">${escapeHtml(hospital.name)}</div>
      <div class="nav-list">${navHtml}</div>
    </div>
    <div class="topbar-right">
      <span>院内账号: <strong>${escapeHtml(state.hospitalUsername || seed.defaultHisAccount)}</strong></span>
      <button type="button" class="logout-btn" id="hisLogoutBtn">退出院内登录</button>
    </div>
  </div>

  <div class="layout">
    <div>
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">业务概况 · ${escapeHtml(state.activeNav)}</div>
          <div class="period-switch">
            <button type="button" class="period-btn ${state.period === 'month' ? 'active' : ''}" data-period="month">本月</button>
            <button type="button" class="period-btn ${state.period === 'lastMonth' ? 'active' : ''}" data-period="lastMonth">上月</button>
          </div>
        </div>
        <div class="kpi-grid">
          <div class="kpi-card kpi-blue">
            <div>
              <div class="kpi-val">${inbound}</div>
              <div class="kpi-lbl">入库金额(万元)</div>
            </div>
            <div class="kpi-icon" style="background:#3b82f6;">入</div>
          </div>
          <div class="kpi-card kpi-green">
            <div>
              <div class="kpi-val">${outbound}</div>
              <div class="kpi-lbl">出库金额(万元)</div>
            </div>
            <div class="kpi-icon" style="background:#10b981;">出</div>
          </div>
          <div class="kpi-card kpi-amber">
            <div>
              <div class="kpi-val">${inventory}</div>
              <div class="kpi-lbl">库存金额(万元)</div>
            </div>
            <div class="kpi-icon" style="background:#f59e0b;">存</div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header" style="margin-bottom:6px;">
          <div class="panel-title">库存效期预警</div>
          <span style="font-size:12px;color:#6b7280;font-family:monospace;">通道 ${escapeHtml(session.mqChannelId)}</span>
        </div>
        <div class="tabs-bar">
          <div class="tabs-left">${tabsHtml}</div>
          <input class="search-input" id="searchBox" type="text" placeholder="筛选物资 / 批号 / 供应商" value="${escapeHtml(
            state.searchKeyword
          )}" />
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th class="num">序号</th>
                <th>物资名称</th>
                <th>规格型号</th>
                <th class="num">单价/单位</th>
                <th class="num">预警数量</th>
                <th class="num">金额</th>
                <th>批号</th>
                <th>失效日期</th>
                <th>供应商</th>
                <th>厂家</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div>
      <div class="panel">
        <div class="panel-header"><div class="panel-title">待办事项</div></div>
        <div class="todo-grid">
          <div class="todo-item" data-todo="往来审核"><div class="todo-box" style="background:#3b82f6;">往</div><div class="todo-lbl">往来审核</div></div>
          <div class="todo-item" data-todo="证件审核"><div class="todo-box" style="background:#eab308;">证</div><div class="todo-lbl">证件审核</div></div>
          <div class="todo-item" data-todo="物资审核"><div class="todo-box" style="background:#22c55e;">物</div><div class="todo-lbl">物资审核</div></div>
          <div class="todo-item" data-todo="待出库"><div class="todo-box" style="background:#f59e0b;">出</div><div class="todo-lbl">待出库</div></div>
          <div class="todo-item" data-todo="采购计划"><div class="todo-box" style="background:#06b6d4;">采</div><div class="todo-lbl">采购计划</div></div>
          <div class="todo-item" data-todo="业务处理"><div class="todo-box" style="background:#8b5cf6;">业</div><div class="todo-lbl">业务处理</div></div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header"><div class="panel-title">证件效期预警</div><span style="font-size:12px;color:#6b7280;">已过期</span></div>
        <div class="stat-grid">
          <div><div class="stat-num">${seed.certAlerts.enterprise}</div><div class="stat-lbl">企业证件</div></div>
          <div><div class="stat-num">${seed.certAlerts.registration}</div><div class="stat-lbl">注册证</div></div>
          <div><div class="stat-num">${seed.certAlerts.manufacturer}</div><div class="stat-lbl">厂家证件</div></div>
          <div><div class="stat-num">${seed.certAlerts.authorization}</div><div class="stat-lbl">授权书</div></div>
          <div><div class="stat-num">${seed.certAlerts.legalProxy}</div><div class="stat-lbl">法人委托书</div></div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header"><div class="panel-title">库存预警</div></div>
        <div class="stat-grid">
          <div><div class="stat-num">${seed.stockAlerts.shortage}</div><div class="stat-lbl">缺货</div></div>
          <div><div class="stat-num">${seed.stockAlerts.safety}</div><div class="stat-lbl">安全库存</div></div>
          <div><div class="stat-num">${seed.stockAlerts.overstock}</div><div class="stat-lbl">积压库存</div></div>
        </div>
      </div>

      <div class="panel">
        <div class="footer-info">
          <div>
            <div style="color:#6b7280;">客服热线：</div>
            <div style="font-size:14px;font-weight:600;color:#111827;">${escapeHtml(seed.hotline)}</div>
            <div style="font-size:11px;color:#6b7280;">工作日 09:00-17:00</div>
          </div>
          <div>
            <div style="color:#6b7280;">库房电话：</div>
            <div style="font-size:14px;font-weight:600;color:#111827;">${escapeHtml(seed.warehousePhone)}</div>
            <div style="font-size:11px;color:#6b7280;">${escapeHtml(seed.warehouseAddress)}</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="toast" id="toast"></div>
  <script>
    const sid = ${sessionJson};
    function notifyParent(patch) {
      window.parent.postMessage({ type: 'HOSPITAL_STATE_UPDATE', sessionId: sid, patch }, '*');
    }
    function showToast(msg) {
      const el = document.getElementById('toast');
      el.textContent = msg;
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 1800);
    }
    document.addEventListener('click', () => {
      window.parent.postMessage({ type: 'HOSPITAL_ACTIVITY', sessionId: sid }, '*');
    });
    document.getElementById('hisLogoutBtn').addEventListener('click', () => {
      window.parent.postMessage({ type: 'HOSPITAL_LOGOUT', sessionId: sid }, '*');
    });
    document.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        notifyParent({ activeNav: btn.getAttribute('data-nav') });
      });
    });
    document.querySelectorAll('[data-period]').forEach((btn) => {
      btn.addEventListener('click', () => {
        notifyParent({ period: btn.getAttribute('data-period') });
      });
    });
    document.querySelectorAll('[data-bucket]').forEach((btn) => {
      btn.addEventListener('click', () => {
        notifyParent({ expiryBucket: btn.getAttribute('data-bucket') });
      });
    });
    document.querySelectorAll('[data-todo]').forEach((item) => {
      item.addEventListener('click', () => {
        showToast('已通过 MQ 通道拉取「' + item.getAttribute('data-todo') + '」待办列表');
      });
    });
    const searchBox = document.getElementById('searchBox');
    let timer = null;
    searchBox.addEventListener('input', (e) => {
      clearTimeout(timer);
      const val = e.target.value;
      timer = setTimeout(() => notifyParent({ searchKeyword: val }), 250);
    });
  </script>
</body>
</html>`;
}
