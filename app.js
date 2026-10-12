const DOCTORS=[
{id:1,name:"Dr. Sarah Namuli",area:"General Medicine",gender:"Female",hours:"Mon–Fri, 8am–4pm",startTime:"08:00",endTime:"16:00"},
{id:2,name:"Dr. John Okello",area:"General Medicine",gender:"Male",hours:"Mon–Sat, 9am–5pm",startTime:"09:00",endTime:"17:00"},
{id:3,name:"Dr. Grace Atim",area:"Cardiology",gender:"Female",hours:"Tue–Thu, 10am–3pm",startTime:"10:00",endTime:"15:00"},
{id:4,name:"Dr. Peter Mugisha",area:"Cardiology",gender:"Male",hours:"Mon–Wed, 8am–2pm",startTime:"08:00",endTime:"14:00"},
{id:5,name:"Dr. Ruth Kansiime",area:"Dermatology",gender:"Female",hours:"Mon–Fri, 10am–4pm",startTime:"10:00",endTime:"16:00"},
{id:6,name:"Dr. David Ssemwogerere",area:"Pediatrics",gender:"Male",hours:"Mon–Fri, 8am–1pm",startTime:"08:00",endTime:"13:00"},
{id:7,name:"Dr. Mary Achieng",area:"Pediatrics",gender:"Female",hours:"Wed–Sat, 9am–4pm",startTime:"09:00",endTime:"16:00"},
{id:8,name:"Dr. Brian Kato",area:"Dentistry",gender:"Male",hours:"Mon–Fri, 9am–5pm",startTime:"09:00",endTime:"17:00"},
{id:9,name:"Dr. Esther Nakato",area:"Gynecology",gender:"Female",hours:"Mon–Thu, 8am–3pm",startTime:"08:00",endTime:"15:00"}];
const $=s=>document.querySelector(s);
const get=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}};
const set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const DAY_INDEX={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
const getDoctorAvailableDays=doc=>{
  const range=(doc.hours||"").split(",")[0].trim();
  const days=range.split(/[-–]/).map(d=>d.trim());
  if(days.length===1){const key=days[0];return key in DAY_INDEX?[DAY_INDEX[key]]:[];}
  const start=DAY_INDEX[days[0]],end=DAY_INDEX[days[1]];
  if(start===undefined||end===undefined)return[];
  const out=[];
  let cur=start;
  while(true){out.push(cur%7); if(cur%7===end)break; cur=(cur+1)%7;}
  return out;
};
const isDoctorAvailableOnDate=(doc,date)=>{if(!date)return false; const day=new Date(`${date}T12:00:00`).getDay(); return getDoctorAvailableDays(doc).includes(day);};
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
const escapeHtml=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function openAttachmentDb(){
  return new Promise((resolve,reject)=>{
    if(!window.indexedDB){reject(new Error("File storage is not available in this browser."));return;}
    const request=indexedDB.open("hos_attachments",1);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains("attachments")){
        const store=db.createObjectStore("attachments",{keyPath:"id",autoIncrement:true});
        store.createIndex("appointmentId","appointmentId",{unique:false});
      }
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error("Could not open file storage."));
  });
}
function saveAppointmentAttachments(appointmentId,files){
  return openAttachmentDb().then(db=>new Promise((resolve,reject)=>{
    let transaction;
    try{
      transaction=db.transaction("attachments","readwrite");
      const store=transaction.objectStore("attachments");
      files.forEach(file=>store.add({appointmentId,name:file.name,type:file.type,blob:file}));
      transaction.oncomplete=()=>{db.close();resolve();};
      transaction.onerror=()=>{db.close();reject(transaction.error||new Error("Could not save the attachments."));};
      transaction.onabort=()=>{db.close();reject(transaction.error||new Error("Could not save the attachments."));};
    }catch(error){db.close();reject(error);}
  }));
}
function getAppointmentAttachments(appointmentId){
  return openAttachmentDb().then(db=>new Promise((resolve,reject)=>{
    let transaction;
    try{
      transaction=db.transaction("attachments","readonly");
      const request=transaction.objectStore("attachments").index("appointmentId").getAll(appointmentId);
      request.onsuccess=()=>{const files=request.result;db.close();resolve(files);};
      request.onerror=()=>{db.close();reject(request.error||new Error("Could not load the attachments."));};
    }catch(error){db.close();reject(error);}
  }));
}

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
  const date=$("#date"),time=$("#time");
  const attachments=$("#attachments"),attachmentList=$("#attachmentList");
  attachments.onchange=()=>{attachmentList.textContent=Array.from(attachments.files).map(file=>file.name).join(", ");};
  $("#docInfo").textContent=`Booking with ${doc.name} (${doc.area})`;
  const today=new Date().toISOString().split("T")[0];
  date.min=today;
  time.min=doc.startTime;
  time.max=doc.endTime;
  time.step=1800;
  $("#timeAvailability").textContent=`Available ${doc.hours.split(", ")[1]}`;
  $("#dateAvailability").textContent=`Available days: ${doc.hours.split(",")[0]}`;
  date.onchange=()=>{
    const selectedDate=date.value;
    if(selectedDate&&!isDoctorAvailableOnDate(doc,selectedDate)){
      setErr(date,`Doctor is available only on ${doc.hours.split(",")[0]}`);
    }else if(selectedDate&&selectedDate<today){
      setErr(date,"Date cannot be in the past");
    }else{
      setErr(date,"");
    }
  };
  $("#bookForm").onsubmit=async e=>{e.preventDefault();
    const f=id=>$("#"+id),v=id=>f(id).value.trim();
    const age=+v("age");
    const messageWords=v("message").split(/\s+/).filter(Boolean).length;
    const files=Array.from(f("attachments").files);
    const invalidFile=files.some(file=>!file.type.startsWith("image/")&&file.type!=="application/pdf"&&file.type!=="application/dicom"&&!/\.(pdf|dcm)$/i.test(file.name));
    const ok=[
      setErr(f("name"),v("name").length<3?"Enter your full name (min 3 characters)":!/^[A-Za-z .'-]+$/.test(v("name"))?"Name can only contain letters":""),
      setErr(f("age"),!v("age")||age<0||age>120?"Enter a valid age (0–120)":""),
      setErr(f("pgender"),!v("pgender")?"Select gender":""),
      setErr(f("email"),!emailOk(v("email"))?"Enter a valid email":""),
      setErr(f("phone"),!/^\+?[0-9]{9,13}$/.test(v("phone"))?"Enter a valid phone number (9–13 digits)":""),
      setErr(f("location"),!v("location")?"Location is required":""),
      setErr(f("time"),!v("time")?"Select a time":v("time")<doc.startTime||v("time")>doc.endTime?`Choose a time between ${doc.startTime} and ${doc.endTime}`:""),
      setErr(f("date"),!v("date")?"Select a date":v("date")<today?"Date cannot be in the past":!isDoctorAvailableOnDate(doc,v("date"))?`Doctor is available only on ${doc.hours.split(",")[0]}`:""),
      setErr(f("attachments"),invalidFile?"Attach image, PDF, or DICOM files only":""),
      setErr(f("message"),messageWords<10?"Enter at least 10 words":messageWords>1000?"Message cannot exceed 1,000 words":"")
    ].every(Boolean);
    if(!ok)return;
    const ap=get("hos_appts",[]);
    const a={id:"APT-"+String(1000+ap.length+1),doctorId:doc.id,doctor:doc.name,area:doc.area,name:v("name"),age:v("age"),gender:v("pgender"),email:v("email"),phone:v("phone"),location:v("location"),time:v("time"),date:v("date"),message:v("message"),attachmentCount:files.length,status:"Pending"};
    if(files.length){
      try{await saveAppointmentAttachments(a.id,files);}
      catch(error){console.error(error);setErr(f("attachments"),"Could not save the attachments. Please try again.");return;}
    }
    ap.push(a);set("hos_appts",ap);set("hos_last",a.id);location.href="confirmation.html";};
}

/* DETAILS */
if(page==="details"){
  let attachmentUrls=[];
  const render=()=>{attachmentUrls.forEach(url=>URL.revokeObjectURL(url));attachmentUrls=[];const ap=get("hos_appts",[]),last=get("hos_last");
    $("#box").innerHTML=ap.length?ap.slice().reverse().map(a=>`<table style="margin-bottom:20px">
    <tr><th>Reference</th><td>${a.id} ${a.id===last?"(latest)":""}</td></tr>
    <tr><th>Status</th><td><span class="tag ${a.status==="Approved"?"ok":""}">${a.status}</span></td></tr>
    <tr><th>Doctor</th><td>${a.doctor} – ${a.area}</td></tr>
    <tr><th>Date &amp; Time</th><td>${a.date} at ${a.time}</td></tr>
    <tr><th>Patient</th><td>${a.name}, ${a.age} yrs, ${a.gender}</td></tr>
    <tr><th>Contact</th><td>${a.email} | ${a.phone}</td></tr>
    <tr><th>Location</th><td>${a.location}</td></tr>
    <tr><th>Message</th><td>${a.message?escapeHtml(a.message):"—"}</td></tr>
    ${a.attachmentCount?`<tr><th>Attachments</th><td><div data-attachments-for="${escapeHtml(a.id)}">Loading attachments…</div></td></tr>`:""}</table>
    ${a.status==="Pending"?`<button class="btn" style="margin:-8px 0 24px" data-id="${a.id}">Simulate approval (demo)</button>`:""}`).join(""):"<p>You have no appointments yet.</p>";
    ap.filter(a=>a.attachmentCount).forEach(async a=>{
      const target=document.querySelector(`[data-attachments-for="${a.id}"]`);
      if(!target)return;
      try{
        const files=await getAppointmentAttachments(a.id);
        target.textContent="";
        files.forEach(file=>{
          const url=URL.createObjectURL(file.blob),link=document.createElement("a");
          attachmentUrls.push(url);
          link.href=url;link.download=file.name;link.textContent=file.name;
          target.append(link,document.createElement("br"));
        });
        if(!files.length)target.textContent="No saved attachments.";
      }catch(error){console.error(error);target.textContent="Could not load attachments.";}
    });
    document.querySelectorAll("[data-id]").forEach(b=>b.onclick=()=>{const l=get("hos_appts",[]);l.find(x=>x.id===b.dataset.id).status="Approved";set("hos_appts",l);render()});};
  render();
}
