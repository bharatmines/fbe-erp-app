// --- SECURITY & LOGIN LOGIC ---
const SECRET_PIN = "2026"; 

window.onload = function() {
  if (localStorage.getItem('fbeLoggedIn') === 'true') {
    unlockApp();
  }
};

function checkLogin() {
  const enteredPin = document.getElementById('pinInput').value;
  if (enteredPin === SECRET_PIN) {
    localStorage.setItem('fbeLoggedIn', 'true');
    unlockApp();
  } else {
    document.getElementById('loginError').style.display = 'block';
  }
}

function unlockApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appContent').style.display = 'flex'; // Fixes the layout wrapper!
  fetchAllData(); 
}

function logout() {
  localStorage.removeItem('fbeLoggedIn');
  location.reload(); 
}

// --- API LINKS ---
const apis = {
  sales: 'https://api.sheety.co/44d3fe45eb6aab6505e4de925e5ad989/fbeDatabase/sales',
  production: 'https://api.sheety.co/44d3fe45eb6aab6505e4de925e5ad989/fbeDatabase/production',
  electricity: 'https://api.sheety.co/44d3fe45eb6aab6505e4de925e5ad989/fbeDatabase/electricityUnits',
  consumption: 'https://api.sheety.co/44d3fe45eb6aab6505e4de925e5ad989/fbeDatabase/consumption'
};

let globalData = {};
let mySalesChart, myBioChart;

// --- UI & MODAL FUNCTIONS ---
function toggleMenu() { document.getElementById('sidebar').classList.toggle('active'); }
function openModal() { document.getElementById('prodModal').style.display = 'flex'; toggleMenu(); }
function closeModal() { document.getElementById('prodModal').style.display = 'none'; document.getElementById('formMessage').innerText = ""; }

// --- DATA HELPERS ---
function getNum(row, keyword) {
  for (let key in row) {
    if (key.toLowerCase().includes(keyword.toLowerCase())) {
      return parseFloat(String(row[key] || '0').replace(/[^0-9.-]+/g, "")) || 0;
    }
  } return 0;
}
function isRealData(row) { return row.date && row.date.trim() !== ''; }
function parseSheetDate(dateStr) {
  if (!dateStr) return null;
  let parts = dateStr.split('/');
  return parts.length === 3 ? new Date(parts[2], parts[1] - 1, parts[0]) : null;
}
function toggleCustomDate() {
  let customRangeDiv = document.getElementById('customDateRange');
  if (document.getElementById('dateFilter').value === 'custom') {
    customRangeDiv.style.display = 'flex';
  } else {
    customRangeDiv.style.display = 'none';
    loadDashboard();
  }
}

// --- FETCH DATA ---
async function fetchAllData() {
  try {
    const [s, p, e, c] = await Promise.all([
      fetch(apis.sales).then(r => r.json()), 
      fetch(apis.production).then(r => r.json()),
      fetch(apis.electricity).then(r => r.json()), 
      fetch(apis.consumption).then(r => r.json())
    ]);
    globalData = { 
      sales: s.sales.filter(isRealData), 
      prod: p.production.filter(isRealData), 
      elec: e.electricityUnits.filter(isRealData), 
      cons: c.consumption.filter(isRealData) 
    };
    loadDashboard(); 
  } catch (err) { alert("Error loading data from Sheety!"); }
}

// --- BUILD DASHBOARD ---
function loadDashboard() {
  if (!globalData.sales) return;
  let filterType = document.getElementById('dateFilter').value;
  let sData = globalData.sales, pData = globalData.prod, eData = globalData.elec, cData = globalData.cons;

  // Filter Logic
  if (filterType === 'recent') {
    sData = sData.slice(-30); pData = pData.slice(-30); eData = eData.slice(-30); cData = cData.slice(-30);
  } else if (filterType === 'custom') {
    let startInput = document.getElementById('startDate').value;
    let endInput = document.getElementById('endDate').value;
    if (startInput && endInput) {
      let startDate = new Date(startInput), endDate = new Date(endInput);
      endDate.setHours(23, 59, 59, 999);
      let inRange = (row) => { let d = parseSheetDate(row.date); return d && d >= startDate && d <= endDate; };
      sData = sData.filter(inRange); pData = pData.filter(inRange); eData = eData.filter(inRange); cData = cData.filter(inRange);
    }
  }

  // KPIs
  let tSales = 0, tProd = 0, tElec = 0;
  sData.forEach(r => tSales += getNum(r, 'amount'));
  pData.forEach(r => tProd += getNum(r, 'production'));
  eData.forEach(r => tElec += getNum(r, 'consumed'));
  let energyPerMt = tProd > 0 ? (tElec / tProd).toFixed(2) : 0;

  document.getElementById('kpi-sales').innerHTML = `<h3>Total Sales</h3><h2>₹ ${tSales.toLocaleString('en-IN', {maximumFractionDigits:0})}</h2>`;
  document.getElementById('kpi-production').innerHTML = `<h3>Total Production</h3><h2>${tProd.toLocaleString('en-IN', {maximumFractionDigits:1})} MT</h2>`;
  document.getElementById('kpi-energy').innerHTML = `<h3>Energy Units/MT</h3><h2 style="color:${energyPerMt > 25 ? '#ef4444' : '#16a34a'}">${energyPerMt}</h2>`;

  // Sales Line Chart
  if(mySalesChart) mySalesChart.destroy();
  let recentSales = sData.slice(-15); 
  mySalesChart = new Chart(document.getElementById('salesChart'), {
    type: 'line', 
    data: { 
      labels: recentSales.map(r => r.date), 
      datasets: [{ label: 'Sales (₹)', data: recentSales.map(r => getNum(r, 'amount')), borderColor: '#0b4f6c', tension: 0.3 }] 
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  // Biomass Doughnut Chart
  let bioMix = {};
  cData.forEach(r => {
    let item = r.itemName || 'Unknown';
    if(!item.toLowerCase().includes('bardana')) bioMix[item] = (bioMix[item] || 0) + getNum(r, 'qty');
  });
  if(myBioChart) myBioChart.destroy();
  myBioChart = new Chart(document.getElementById('biomassChart'), {
    type: 'doughnut', 
    data: { 
      labels: Object.keys(bioMix), 
      datasets: [{ data: Object.values(bioMix), backgroundColor: ['#16a34a', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'] }] 
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
  });

  // Outstanding Table
  let outstanding = {};
  globalData.sales.forEach(r => { // Calculate outstanding based on ALL data regardless of filter
    if (String(r.paymentStatus || '').toLowerCase() === 'pending') {
      let cust = r.customerName || 'Unknown';
      outstanding[cust] = (outstanding[cust] || 0) + getNum(r, 'amount');
    }
  });
  let tableHtml = '';
  for(let cust in outstanding) { 
    if(outstanding[cust] > 0) tableHtml += `<tr><td>${cust}</td><td>₹ ${outstanding[cust].toLocaleString('en-IN')}</td></tr>`; 
  }
  document.getElementById('outstandingTable').querySelector('tbody').innerHTML = tableHtml || "<tr><td colspan='2'>No pending payments! 🎉</td></tr>";
}

// --- FORM SUBMISSION (Write to Sheet) ---
async function submitProduction() {
  let dateVal = document.getElementById('formDate').value, shiftVal = document.getElementById('formShift').value;
  let mtVal = document.getElementById('formMT').value, hrsVal = document.getElementById('formHrs').value;
  if(!dateVal || !mtVal || !hrsVal) { alert("Please fill all fields!"); return; }
  
  document.getElementById('formMessage').innerText = "⏳ Saving...";
  try {
    await fetch(apis.production, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        production: { 
          date: dateVal.split('-').reverse().join('/'), 
          workShift: shiftVal, 
          productionMt: mtVal, 
          machineRunHrs: hrsVal 
        } 
      })
    });
    document.getElementById('formMessage').innerText = "✅ Saved successfully!";
    setTimeout(() => { closeModal(); fetchAllData(); }, 1500); 
  } catch(err) { 
    document.getElementById('formMessage').innerText = "❌ Error saving."; 
  }
}
