import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  "https://tgybhckhjbmeafruvokc.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRneWJoY2toamJtZWFmcnV2b2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3ODc5ODQsImV4cCI6MjA2NjM2Mzk4NH0.OWNrddp4hhZRSaCpH4NGRtoRB54hUcWDbfMEhi9Adfg"
);

const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) window.location.href = "index.html";
const userId = user.id;

let data = [];
let currentPage = 1, statsPage = 1;
const fullPageSize = 10, statsPageSize = 5;
let currentStats = [];

let customRange = null;
let detailDateRange = null;

function format(d) {
  const date = new Date(d);
  return date.toISOString().split('T')[0];
}

function getWeekRange(d) {
  const date = new Date(d);
  const day = date.getDay() || 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return [format(monday), format(sunday)];
}

function setDefaultWeekLabel() {
  const [start, end] = getWeekRange(new Date());
  const weekLabel = `${start} ~ ${end}`;
  const select = document.getElementById('weekSelect');
  select.options[0].text = weekLabel;
}

async function loadData() {
  const { data: rows, error } = await supabase
    .from('invites')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) return alert("加载数据失败：" + error.message);
  data = rows;
  renderStatsTable();
  renderFullTable();
  setDefaultWeekLabel();
}

function onWeekSelectChange() {
  const value = document.getElementById('weekSelect').value;
  if (value === 'custom') {
    openStatsDateRangeDialog();
  }
}

function openStatsDateRangeDialog() {
  document.getElementById('dateRangeModal').style.display = 'flex';
  const today = format(new Date());
  document.getElementById('customStartDate').value = today;
  document.getElementById('customEndDate').value = today;
}

function closeDateRangeDialog() {
  document.getElementById('dateRangeModal').style.display = 'none';
  const [start, end] = customRange || getWeekRange(new Date());
  document.getElementById('weekSelect').options[0].text = `${format(start)} ~ ${format(end)}`;
  document.getElementById('weekSelect').selectedIndex = 0;
}

function applyCustomRange() {
  const start = document.getElementById('customStartDate').value;
  const end = document.getElementById('customEndDate').value;
  if (!start || !end || new Date(start) > new Date(end)) {
    alert('请选择有效的日期范围');
    return;
  }
  customRange = [new Date(start), new Date(end)];
  document.getElementById('dateRangeModal').style.display = 'none';
  const select = document.getElementById('weekSelect');
  select.options[0].text = `${start} ~ ${end}`;
  select.selectedIndex = 0;
  renderStatsTable();
}

function renderStatsTable() {
  let start, end;
  if (customRange) {
    [start, end] = customRange;
  } else {
    [start, end] = getWeekRange(new Date());
    start = new Date(start);
    end = new Date(end);
  }

  const map = {};
  data.forEach(d => {
    const date = new Date(d.date);
    if (date >= start && date <= end) {
      map[d.inviter] = (map[d.inviter] || 0) + 1;
    }
  });

  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
  currentStats = sorted;
  const totalPages = Math.ceil(sorted.length / statsPageSize);
  statsPage = Math.min(statsPage, totalPages || 1);
  const pageData = sorted.slice((statsPage - 1) * statsPageSize, statsPage * statsPageSize);

  const tbody = document.querySelector('#statsTable tbody');
  tbody.innerHTML = '';
  pageData.forEach(([inviter, count]) => {
    const reward = count >= 10 ? 'K400' : count >= 5 ? 'K200' : '暂无奖励';
    tbody.innerHTML += `<tr><td>${inviter}</td><td>${count}</td><td>${reward}</td></tr>`;
  });
  for (let i = pageData.length; i < statsPageSize; i++) {
    tbody.innerHTML += `<tr><td>&nbsp;</td><td></td><td></td></tr>`;
  }

  renderStatsPagination(totalPages);
}

function renderStatsPagination(totalPages) {
  let container = document.getElementById('statsPagination');
  if (!container) {
    container = document.createElement('div');
    container.id = 'statsPagination';
    container.style.marginTop = '10px';
    container.style.textAlign = 'center';
    document.querySelector('#statsTable').after(container);
  }
  if (totalPages <= 1) return container.innerHTML = '';
  let buttons = '';
  for (let i = 1; i <= totalPages; i++) {
    buttons += `<button class="btn" style="margin:2px; ${i === statsPage ? 'background:#2e7d32' : ''}" onclick="goToStatsPage(${i})">${i}</button>`;
  }
  container.innerHTML = buttons;
}

function onViewModeChange() {
  const mode = document.getElementById('viewMode').value;
  if (mode === 'custom') {
    openDetailDateRangeDialog();
  } else {
    detailDateRange = null;
    renderFullTable();
  }
}

function openDetailDateRangeDialog() {
  document.getElementById('dateRangeModal').style.display = 'flex';
  const today = format(new Date());
  document.getElementById('customStartDate').value = today;
  document.getElementById('customEndDate').value = today;
}

function applyDetailDateRange() {
  const start = document.getElementById('customStartDate').value;
  const end = document.getElementById('customEndDate').value;
  if (!start || !end || new Date(start) > new Date(end)) {
    alert('请选择有效的日期范围');
    return;
  }
  detailDateRange = [new Date(start), new Date(end)];
  document.getElementById('dateRangeModal').style.display = 'none';
  document.getElementById('viewMode').value = 'custom';
  renderFullTable();
}

function cancelDetailDateRange() {
  document.getElementById('dateRangeModal').style.display = 'none';
  document.getElementById('viewMode').value = 'week';
  detailDateRange = null;
  renderFullTable();
}

function renderFullTable() {
  const view = document.getElementById('viewMode').value;
  const filterInviter = document.getElementById('filterInviter').value.trim();
  const [weekStart, weekEnd] = getWeekRange(new Date());

  let filtered = data.filter(d => {
    const date = new Date(d.date);
    return (
      (view === 'all' ||
        (view === 'week' && date >= new Date(weekStart) && date <= new Date(weekEnd)) ||
        (view === 'custom' && detailDateRange && date >= detailDateRange[0] && date <= detailDateRange[1])
      ) &&
      (!filterInviter || d.inviter.includes(filterInviter))
    );
  });

  const totalPages = Math.ceil(filtered.length / fullPageSize);
  currentPage = Math.min(currentPage, totalPages || 1);
  const pageData = filtered.slice((currentPage - 1) * fullPageSize, currentPage * fullPageSize);

  const tbody = document.querySelector('#fullTable tbody');
  tbody.innerHTML = '';
  pageData.forEach(d => {
    const i = data.findIndex(row => row.id === d.id);
    tbody.innerHTML += `<tr>
      <td>${d.date}</td>
      <td>${d.inviter}</td>
      <td>${d.member}</td>
      <td><button class="btn" onclick="deleteData(${i})">删除</button></td>
    </tr>`;
  });
  for (let i = pageData.length; i < fullPageSize; i++) {
    tbody.innerHTML += `<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>`;
  }

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  let container = document.getElementById('pagination');
  if (!container) {
    container = document.createElement('div');
    container.id = 'pagination';
    container.style.marginTop = '10px';
    container.style.textAlign = 'center';
    document.querySelector('#fullTable').after(container);
  }
  if (totalPages <= 1) return container.innerHTML = '';
  let buttons = '';
  for (let i = 1; i <= totalPages; i++) {
    buttons += `<button class="btn" style="margin:2px; ${i === currentPage ? 'background:#2e7d32' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  container.innerHTML = buttons;
}

async function deleteData(index) {
  const row = data[index];
  if (!confirm("确认删除？")) return;
  const { error } = await supabase.from('invites').delete().eq('id', row.id);
  if (error) return alert("删除失败：" + error.message);
  loadData();
}

function openAddDialog() {
  document.getElementById('addModal').style.display = 'flex';
  document.getElementById('newDate').value = format(new Date());
}

function closeAddDialog() {
  document.getElementById('addModal').style.display = 'none';
}

async function addData() {
  const date = document.getElementById('newDate').value;
  const inviter = document.getElementById('newInviter').value.trim();
  const member = document.getElementById('newMember').value.trim();
  if (!date || !inviter || !member) return alert("请填写完整信息");
  const { error } = await supabase.from('invites').insert([{ user_id: userId, date, inviter, member }]);
  if (error) return alert("添加失败：" + error.message);
  closeAddDialog();
  loadData();
}

async function logout() {
  await supabase.auth.signOut();
  window.location.href = "index.html";
}

function goToPage(p) {
  currentPage = p;
  renderFullTable();
}

function goToStatsPage(p) {
  statsPage = p;
  renderStatsTable();
}

window.logout = logout;
window.renderStatsTable = renderStatsTable;
window.renderFullTable = renderFullTable;
window.addData = addData;
window.deleteData = deleteData;
window.openAddDialog = openAddDialog;
window.closeAddDialog = closeAddDialog;
window.goToPage = goToPage;
window.goToStatsPage = goToStatsPage;
window.onWeekSelectChange = onWeekSelectChange;
window.applyCustomRange = applyCustomRange;
window.closeDateRangeDialog = closeDateRangeDialog;
window.onViewModeChange = onViewModeChange;
window.applyDetailDateRange = applyDetailDateRange;
window.cancelDetailDateRange = cancelDetailDateRange;

loadData();
