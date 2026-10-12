const DOCTORS=[
{id:1,name:"Dr. Sarah Namuli",area:"General Medicine",gender:"Female",hours:"Mon–Fri, 8am–4pm"},
{id:2,name:"Dr. John Okello",area:"General Medicine",gender:"Male",hours:"Mon–Sat, 9am–5pm"},
{id:3,name:"Dr. Grace Atim",area:"Cardiology",gender:"Female",hours:"Tue–Thu, 10am–3pm"},
{id:4,name:"Dr. Peter Mugisha",area:"Cardiology",gender:"Male",hours:"Mon–Wed, 8am–2pm"},
{id:5,name:"Dr. Ruth Kansiime",area:"Dermatology",gender:"Female",hours:"Mon–Fri, 10am–4pm"},
{id:6,name:"Dr. David Ssemwogerere",area:"Pediatrics",gender:"Male",hours:"Mon–Fri, 8am–1pm"},
{id:7,name:"Dr. Mary Achieng",area:"Pediatrics",gender:"Female",hours:"Wed–Sat, 9am–4pm"},
{id:8,name:"Dr. Brian Kato",area:"Dentistry",gender:"Male",hours:"Mon–Fri, 9am–5pm"},
{id:9,name:"Dr. Esther Nakato",area:"Gynecology",gender:"Female",hours:"Mon–Thu, 8am–3pm"}];
const $=s=>document.querySelector(s);
const get=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}};
const set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const page=document.body.dataset.page;
const LOGO='<svg viewBox="0 0 64 64" fill="none" stroke="#2c3e5c" stroke-width="4"><rect x="10" y="10" width="44" height="48" rx="5"/><rect x="22" y="4" width="20" height="10" rx="3" fill="#2c3e5c"/><path d="M22 36l8 8 14-16" stroke="#1e88e5"/></svg>';

if(page!=="login"&&!get("hos_user")) location.href="index.html";

/* Sidebar + header logout */
const sb=$("#sidebar");
if(sb){sb.innerHTML=`<div class="brand">${LOGO}HosAppoint</div><h4>MENU</h4>
<a href="dashboard.html" class="${page==="dashboard"?"active":""}">Dashboard</a>
<a href="doctors.html" class="${page==="doctors"?"active":""}">View Doctors</a>
<a href="details.html" class="${page==="details"?"active":""}">My Appointments</a>
<a href="vitals.html" class="${page==="vitals"?"active":""}">My Vitals</a>`;}
const lo=$("#logout");if(lo)lo.onclick=()=>{localStorage.removeItem("hos_user");location.href="index.html"};

/* Helpers for validation */
function setErr(el,msg){el.classList.toggle("invalid",!!msg);const e=el.closest("div,.pw")?.parentElement.querySelector(`[data-for="${el.id}"]`)||document.querySelector(`[data-for="${el.id}"]`);if(e)e.textContent=msg||"";return !msg}
const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/* LOGIN */
if(page==="login"){
  $("#logo").innerHTML=LOGO;
  $("#eye").onclick=()=>{const p=$("#password");p.type=p.type==="password"?"text":"password"};
  $("#loginForm").onsubmit=e=>{e.preventDefault();
    const em=$("#email"),pw=$("#password");
    const a=setErr(em,!em.value.trim()?"Email is required":!emailOk(em.value.trim())?"Enter a valid email":"");
    const b=setErr(pw,!pw.value?"Password is required":pw.value.length<6?"Password must be at least 6 characters":"");
    if(a&&b){set("hos_user",{email:em.value.trim()});location.href="dashboard.html"}};
  $("#google").onclick=()=>{set("hos_user",{email:"google.user@gmail.com"});location.href="dashboard.html"};
}

/* DASHBOARD */
if(page==="dashboard"){
  const ap=get("hos_appts",[]);
  $("#total").textContent=ap.length;
  $("#approved").textContent=ap.filter(a=>a.status!=="Pending").length;
  $("#seen").textContent=new Set(ap.filter(a=>a.status==="Approved").map(a=>a.doctorId)).size;
}

/* DOCTORS */
if(page==="doctors"){
  let sel=null;const area=$("#area"),gen=$("#gender"),list=$("#list"),btn=$("#bookBtn");
  [...new Set(DOCTORS.map(d=>d.area))].forEach(a=>area.add(new Option(a,a)));
  function render(){
    const r=DOCTORS.filter(d=>(!area.value||d.area===area.value)&&(!gen.value||d.gender===gen.value));
    if(!r.find(d=>d.id===sel))sel=null;
    list.innerHTML=r.length?r.map(d=>`<div class="doc ${d.id===sel?"sel":""}" data-id="${d.id}"><div class="av">${d.name.split(" ")[1][0]}</div><div><b>${d.name}</b><br><small>${d.area} • ${d.gender}<br>${d.hours}</small></div></div>`).join(""):"<p>No doctors match your selection.</p>";
    btn.disabled=!sel;
    list.querySelectorAll(".doc").forEach(c=>c.onclick=()=>{sel=+c.dataset.id;render()});
  }
  area.onchange=gen.onchange=render;render();
  btn.onclick=()=>{set("hos_doc",DOCTORS.find(d=>d.id===sel));location.href="book.html"};
}

/* BOOKING FORM */
if(page==="book"){
  const doc=get("hos_doc");if(!doc)location.href="doctors.html";
  $("#docInfo").textContent=`Booking with ${doc.name} (${doc.area})`;
  $("#date").min=new Date().toISOString().split("T")[0];
  $("#bookForm").onsubmit=e=>{e.preventDefault();
    const f=id=>$("#"+id),v=id=>f(id).value.trim();
    const age=+v("age"),today=new Date().toISOString().split("T")[0];
    const ok=[
      setErr(f("name"),v("name").length<3?"Enter your full name (min 3 characters)":!/^[A-Za-z .'-]+$/.test(v("name"))?"Name can only contain letters":""),
      setErr(f("age"),!v("age")||age<0||age>120?"Enter a valid age (0–120)":""),
      setErr(f("pgender"),!v("pgender")?"Select gender":""),
      setErr(f("email"),!emailOk(v("email"))?"Enter a valid email":""),
      setErr(f("phone"),!/^\+?[0-9]{9,13}$/.test(v("phone"))?"Enter a valid phone number (9–13 digits)":""),
      setErr(f("location"),!v("location")?"Location is required":""),
      setErr(f("time"),!v("time")?"Select a time":""),
      setErr(f("date"),!v("date")?"Select a date":v("date")<today?"Date cannot be in the past":"")
    ].every(Boolean);
    if(!ok)return;
    const ap=get("hos_appts",[]);
    const a={id:"APT-"+String(1000+ap.length+1),doctorId:doc.id,doctor:doc.name,area:doc.area,name:v("name"),age:v("age"),gender:v("pgender"),email:v("email"),phone:v("phone"),location:v("location"),time:v("time"),date:v("date"),status:"Pending"};
    ap.push(a);set("hos_appts",ap);set("hos_last",a.id);location.href="confirmation.html";};
}

/* DETAILS */
if(page==="details"){
  const render=()=>{const ap=get("hos_appts",[]),last=get("hos_last");
    $("#box").innerHTML=ap.length?ap.slice().reverse().map(a=>`<table style="margin-bottom:20px">
    <tr><th>Reference</th><td>${a.id} ${a.id===last?"(latest)":""}</td></tr>
    <tr><th>Status</th><td><span class="tag ${a.status==="Approved"?"ok":""}">${a.status}</span></td></tr>
    <tr><th>Doctor</th><td>${a.doctor} – ${a.area}</td></tr>
    <tr><th>Date &amp; Time</th><td>${a.date} at ${a.time}</td></tr>
    <tr><th>Patient</th><td>${a.name}, ${a.age} yrs, ${a.gender}</td></tr>
    <tr><th>Contact</th><td>${a.email} | ${a.phone}</td></tr>
    <tr><th>Location</th><td>${a.location}</td></tr></table>
    ${a.status==="Pending"?`<button class="btn" style="margin:-8px 0 24px" data-id="${a.id}">Simulate approval (demo)</button>`:""}`).join(""):"<p>You have no appointments yet.</p>";
    document.querySelectorAll("[data-id]").forEach(b=>b.onclick=()=>{const l=get("hos_appts",[]);l.find(x=>x.id===b.dataset.id).status="Approved";set("hos_appts",l);render()});};
  render();
}
