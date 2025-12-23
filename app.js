const AUTH_KEY = "planup_auth_v1";
const USERS_KEY = "planup_users_v1";

function uid(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function toast(msg){
  const t = document.getElementById("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=> t.classList.remove("show"), 2200);
}

function todayISO(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function loadUsers(){
  const raw = localStorage.getItem(USERS_KEY);
  if(!raw) return [];
  try { return JSON.parse(raw); } catch(e){ return []; }
}

function saveUsers(users){
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function loadAuth(){
  const raw = localStorage.getItem(AUTH_KEY);
  if(!raw) return null;
  try { return JSON.parse(raw); } catch(e){ return null; }
}

function saveAuth(auth){
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

function logout(){
  localStorage.removeItem(AUTH_KEY);
  location.replace("login.html");
}

function hashSimple(s){
  let h = 0;
  for(let i=0;i<s.length;i++){
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

function getDataKey(username){
  const auth = loadAuth();
  const u = username || (auth && auth.username);
  if(!u) return null;
  return `planup_data_user_${u}_v1`;
}

function saveData(data){
  const key = getDataKey();
  if(!key) return;
  localStorage.setItem(key, JSON.stringify(data));
}

function loadData(){
  const key = getDataKey();
  if(!key) return null;

  const raw = localStorage.getItem(key);
  if(raw){
    try { return JSON.parse(raw); } catch(e){}
  }

  const empty = { subjects: [], tasks: [], exams: [] };
  saveData(empty);
  return empty;
}

function setActiveLink(){
  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll(".links a").forEach(a=>{
    const href = (a.getAttribute("href") || "").toLowerCase();
    if(href === path) a.classList.add("active");
    else a.classList.remove("active");
  });
}

function isLoginPage(){
  const file = (location.pathname.split("/").pop() || "").toLowerCase();
  return file === "" || file === "login.html";
}

function guard(){
  if(isLoginPage()) return;

  const auth = loadAuth();
  if(!auth || !auth.username){
    localStorage.removeItem(AUTH_KEY);
    location.replace("login.html");
    return;
  }

  const users = loadUsers();
  const exists = users.some(u => u.username.toLowerCase() === String(auth.username).toLowerCase());
  if(!exists){
    localStorage.removeItem(AUTH_KEY);
    location.replace("login.html");
    return;
  }

  setActiveLink();

  const welcome = document.getElementById("welcomeUser");
  if(welcome) welcome.textContent = `أهلًا، ${auth.username}`;

  const logoutBtn = document.getElementById("logoutBtn");
  if(logoutBtn){
    logoutBtn.addEventListener("click",(e)=>{
      e.preventDefault();
      logout();
    });
  }
}

function initLogin(){
  const loginForm = document.getElementById("loginForm");
  const regForm = document.getElementById("registerForm");

  if(loginForm){
    loginForm.addEventListener("submit",(e)=>{
      e.preventDefault();
      const u = document.getElementById("l_user").value.trim();
      const p = document.getElementById("l_pass").value;

      if(!u || !p){ toast("أدخل اسم المستخدم وكلمة المرور"); return; }

      const users = loadUsers();
      const found = users.find(x=>x.username.toLowerCase()===u.toLowerCase());
      if(!found){ toast("المستخدم غير موجود"); return; }

      if(found.passHash !== hashSimple(p)){
        toast("كلمة المرور خاطئة");
        return;
      }

      saveAuth({username: found.username});
      toast("تم تسجيل الدخول");
      setTimeout(()=> location.replace("index.html"), 600);
    });
  }

  if(regForm){
    regForm.addEventListener("submit",(e)=>{
      e.preventDefault();
      const u = document.getElementById("r_user").value.trim();
      const p1 = document.getElementById("r_pass").value;
      const p2 = document.getElementById("r_pass2").value;

      if(!u || !p1 || !p2){ toast("املأ كل الحقول"); return; }
      if(p1.length < 4){ toast("كلمة المرور لازم 4 أحرف أو أكثر"); return; }
      if(p1 !== p2){ toast("كلمتا المرور غير متطابقتين"); return; }

      const users = loadUsers();
      const exists = users.some(x=>x.username.toLowerCase()===u.toLowerCase());
      if(exists){ toast("اسم المستخدم مستخدم مسبقًا"); return; }

      users.push({username: u, passHash: hashSimple(p1)});
      saveUsers(users);

      saveAuth({username: u});
      toast("تم إنشاء الحساب");
      setTimeout(()=> location.replace("index.html"), 600);
    });
  }
}

function initDashboard(){
  const data = loadData();

  const total = data.tasks.length;
  const done = data.tasks.filter(t=>t.status==="منجز").length;
  const dueToday = data.tasks.filter(t=>t.deadline===todayISO() && t.status!=="منجز").length;

  const k_total = document.getElementById("k_total");
  const k_done = document.getElementById("k_done");
  const k_due_today = document.getElementById("k_due_today");
  const k_due_week = document.getElementById("k_due_week");
  if(k_total) k_total.textContent = total;
  if(k_done) k_done.textContent = done;
  if(k_due_today) k_due_today.textContent = dueToday;
  if(k_due_week) k_due_week.textContent = 0;

  const fill = document.getElementById("progressFill");
  const txt = document.getElementById("progressText");
  const rate = total===0 ? 0 : Math.round((done/total)*100);
  if(fill) fill.style.width = rate + "%";
  if(txt) txt.textContent = `نسبة الإنجاز: ${rate}%`;

  const upcomingBody = document.getElementById("upcomingBody");
  if(upcomingBody){
    const upcoming = [...data.tasks].filter(t=>t.status!=="منجز").sort((a,b)=>a.deadline.localeCompare(b.deadline)).slice(0,5);
    upcomingBody.innerHTML = upcoming.map(t=>`
      <tr>
        <td>${escapeHtml(t.subject||"-")}</td>
        <td>${escapeHtml(t.title||"-")}</td>
        <td>${escapeHtml(t.deadline||"-")}</td>
        <td>${escapeHtml(t.priority||"-")}</td>
      </tr>
    `).join("") || `<tr><td colspan="4" class="small">لا توجد مهام.</td></tr>`;
  }

  const nextExam = document.getElementById("nextExam");
  if(nextExam){
    if(!data.exams.length){
      nextExam.innerHTML = `<h3>أقرب امتحان</h3><div class="sub">لا يوجد امتحانات مضافة.</div>`;
    }
  }
}

function initTasks(){
  const data = loadData();

  const subjectSel = document.getElementById("taskSubject");
  const newSubjectInput = document.getElementById("newSubject");
  const titleInput = document.getElementById("taskTitle");
  const deadlineInput = document.getElementById("taskDeadline");
  const priorityInput = document.getElementById("taskPriority");
  const notesInput = document.getElementById("taskNotes");
  const form = document.getElementById("taskForm");
  const tbody = document.getElementById("tasksBody");
  const mini = document.getElementById("miniStats");

  if(deadlineInput) deadlineInput.value = todayISO();

  function renderSubjects(){
    if(!subjectSel) return;
    subjectSel.innerHTML = `<option value="">اختر المادة</option>` + data.subjects.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  }

  function render(){
    if(mini){
      const total = data.tasks.length;
      const done = data.tasks.filter(t=>t.status==="منجز").length;
      mini.textContent = `المجموع: ${total} • منجز: ${done}`;
    }

    if(!tbody) return;
    tbody.innerHTML = data.tasks.map(t=>`
      <tr>
        <td>${escapeHtml(t.subject)}</td>
        <td>${escapeHtml(t.title)}<div class="small">${escapeHtml(t.notes||"")}</div></td>
        <td>${escapeHtml(t.deadline)}</td>
        <td>${escapeHtml(t.priority)}</td>
        <td>${escapeHtml(t.status)}</td>
        <td class="row">
          <button class="btn" data-act="toggle" data-id="${t.id}">${t.status==="منجز"?"إلغاء":"تم"}</button>
          <button class="btn danger" data-act="del" data-id="${t.id}">حذف</button>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="6" class="small">لا توجد مهام.</td></tr>`;

    saveData(data);
  }

  renderSubjects();
  render();

  if(form){
    form.addEventListener("submit",(e)=>{
      e.preventDefault();

      let subject = subjectSel ? subjectSel.value : "";
      const newSub = newSubjectInput ? newSubjectInput.value.trim() : "";
      if(newSub){
        if(!data.subjects.includes(newSub)) data.subjects.push(newSub);
        subject = newSub;
      }
      const title = titleInput ? titleInput.value.trim() : "";
      const deadline = deadlineInput ? deadlineInput.value : "";
      const priority = priorityInput ? priorityInput.value : "متوسط";
      const notes = notesInput ? notesInput.value.trim() : "";

      if(!subject){ toast("اختر المادة"); return; }
      if(!title){ toast("اكتب عنوان المهمة"); return; }
      if(!deadline){ toast("اختر تاريخ الموعد"); return; }

      data.tasks.push({
        id: uid(),
        subject,
        title,
        deadline,
        priority,
        status: "قيد التنفيذ",
        notes
      });

      if(newSubjectInput) newSubjectInput.value = "";
      if(titleInput) titleInput.value = "";
      if(notesInput) notesInput.value = "";
      if(deadlineInput) deadlineInput.value = todayISO();
      if(subjectSel) subjectSel.value = "";

      renderSubjects();
      toast("تمت إضافة المهمة");
      render();
    });
  }

  if(tbody){
    tbody.addEventListener("click",(e)=>{
      const btn = e.target.closest("button");
      if(!btn) return;
      const id = btn.dataset.id;
      const act = btn.dataset.act;

      const t = data.tasks.find(x=>x.id===id);
      if(!t) return;

      if(act==="toggle"){
        t.status = (t.status==="منجز") ? "قيد التنفيذ" : "منجز";
        toast("تم تحديث الحالة");
        render();
      }

      if(act==="del"){
        data.tasks = data.tasks.filter(x=>x.id!==id);
        toast("تم حذف المهمة");
        render();
      }
    });
  }
}

function initExams(){
  const data = loadData();

  const subjectSel = document.getElementById("examSubject");
  const newSubject = document.getElementById("newExamSubject");
  const titleInp = document.getElementById("examTitle");
  const dateInp = document.getElementById("examDate");
  const locInp = document.getElementById("examLocation");
  const form = document.getElementById("examForm");
  const tbody = document.getElementById("examsBody");

  if(dateInp) dateInp.value = todayISO();

  function renderSubjects(){
    subjectSel.innerHTML =
      `<option value="">اختر المادة</option>` +
      data.subjects.map(s=>`<option value="${s}">${s}</option>`).join("");
  }

  function daysLeft(d){
    const a = new Date(todayISO()).getTime();
    const b = new Date(d).getTime();
    return Math.ceil((b-a)/(1000*60*60*24));
  }

  function render(){
    tbody.innerHTML = data.exams.map(ex=>{
      const left = daysLeft(ex.date);
      return `
        <tr>
          <td>${ex.subject}</td>
          <td>${ex.title}</td>
          <td>${ex.date}</td>
          <td>${ex.location || "-"}</td>
          <td>${left < 0 ? "منتهي" : left + " يوم"}</td>
          <td>
            <button class="btn danger" data-id="${ex.id}">حذف</button>
          </td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="6">لا يوجد امتحانات</td></tr>`;

    saveData(data);
  }

  renderSubjects();
  render();

  form.addEventListener("submit",(e)=>{
    e.preventDefault();

    let subject = subjectSel.value;
    if(newSubject.value){
      subject = newSubject.value;
      if(!data.subjects.includes(subject)) data.subjects.push(subject);
    }

    if(!subject || !titleInp.value || !dateInp.value){
      toast("املأ جميع الحقول");
      return;
    }

    data.exams.push({
      id: uid(),
      subject,
      title: titleInp.value,
      date: dateInp.value,
      location: locInp.value
    });

    form.reset();
    dateInp.value = todayISO();
    newSubject.value = "";
    renderSubjects();
    toast("تمت إضافة الامتحان");
    render();
  });

  tbody.addEventListener("click",(e)=>{
    if(e.target.tagName!=="BUTTON") return;
    const id = e.target.dataset.id;
    data.exams = data.exams.filter(x=>x.id!==id);
    toast("تم حذف الامتحان");
    render();
  });
}
function initWeekly(){
  const data = loadData();
  const wrap = document.getElementById("weekWrap");

  function render(){
    wrap.innerHTML = "";
    if(!data.tasks.length){
      wrap.innerHTML = `<div class="card">لا توجد مهام</div>`;
      return;
    }

    data.tasks.forEach(t=>{
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h3>${t.subject}</h3>
        <p>${t.title}</p>
        <div class="sub">الموعد: ${t.deadline}</div>
        <div class="sub">الحالة: ${t.status}</div>
      `;
      wrap.appendChild(card);
    });
  }

  render();
}
function initProfile(){
  const auth = loadAuth();
  const userSpan = document.getElementById("profileUser");
  const clearBtn = document.getElementById("clearDataBtn");

  if(userSpan) userSpan.textContent = auth.username;

  clearBtn.addEventListener("click", ()=>{
    if(!confirm("هل أنت متأكد من حذف جميع بياناتك؟")) return;

    const key = getDataKey(auth.username);
    localStorage.removeItem(key);
    toast("تم مسح البيانات");
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  const page = document.body.dataset.page;

  if(isLoginPage() || page==="login"){
    initLogin();
    return;
  }

  guard();

  if(page==="dashboard") initDashboard();
  if(page==="tasks") initTasks();
  if(page==="weekly") initWeekly();
  if(page==="exams") initExams();
  if(page==="profile") initProfile();
});
