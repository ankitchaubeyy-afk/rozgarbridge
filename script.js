
const $ = (q)=>document.querySelector(q);
const $$ = (q)=>Array.from(document.querySelectorAll(q));

window.addEventListener("load",()=>{
  setTimeout(()=>$(".loader")?.classList.add("hide"),350);
});

document.addEventListener("DOMContentLoaded",()=>{
  const toggle = $(".mobile-toggle");
  if(toggle){
    toggle.addEventListener("click",()=>{
      $(".nav-links")?.classList.toggle("open");
      $(".nav-actions")?.classList.toggle("open");
    });
  }
  const page = location.pathname.split("/").pop() || "index.html";
  $$("[data-nav]").forEach(a=>{
    if(a.getAttribute("href")===page) a.classList.add("active");
  });

  setupAuth();
  setupFilters();
  setupProfile();
});

function showToast(msg){
  const t = $(".toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2800);
}
function showAlert(msg,type="error"){
  const a = $("#authAlert") || $("#profileAlert");
  if(!a) return;
  a.textContent = msg;
  a.className = "alert show " + type;
}
function setLoading(btn, state, label="Please wait..."){
  if(!btn) return;
  if(state){btn.dataset.old = btn.textContent; btn.textContent = label; btn.disabled=true;}
  else{btn.textContent = btn.dataset.old || btn.textContent; btn.disabled=false;}
}

function setupAuth(){
  if(typeof firebase === "undefined") return;
  if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  auth.onAuthStateChanged(async user=>{
    const loginLink = $("#loginLink");
    const logoutBtn = $("#logoutBtn");
    const userBadge = $("#userBadge");
    if(user){
      if(loginLink) loginLink.style.display = "none";
      if(logoutBtn) logoutBtn.style.display = "inline-flex";
      if(userBadge) userBadge.textContent = user.email;
    }else{
      if(loginLink) loginLink.style.display = "inline-flex";
      if(logoutBtn) logoutBtn.style.display = "none";
      if(userBadge) userBadge.textContent = "";
    }
    if(location.pathname.includes("profile") && !user){
      location.href = "login.html";
    }
  });

  $("#logoutBtn")?.addEventListener("click", async()=>{
    await auth.signOut();
    showToast("Logged out");
    setTimeout(()=>location.href="login.html",600);
  });

  $("#signupBtn")?.addEventListener("click", async()=>{
    const btn=$("#signupBtn"); setLoading(btn,true,"Creating...");
    try{
      const email=$("#email").value.trim();
      const pass=$("#password").value;
      const role=$("#role").value;
      const cred = await auth.createUserWithEmailAndPassword(email, pass);
      await db.collection("users").doc(cred.user.uid).set({
        email, role, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        profileCompleted:false
      },{merge:true});
      showAlert("Account created successfully. Redirecting...", "success");
      setTimeout(()=>location.href="profile.html",900);
    }catch(e){ showAlert(e.message); }
    finally{ setLoading(btn,false); }
  });

  $("#loginBtn")?.addEventListener("click", async()=>{
    const btn=$("#loginBtn"); setLoading(btn,true,"Logging in...");
    try{
      await auth.signInWithEmailAndPassword($("#email").value.trim(), $("#password").value);
      showAlert("Login successful. Redirecting...", "success");
      setTimeout(()=>location.href="profile.html",650);
    }catch(e){ showAlert(e.message); }
    finally{ setLoading(btn,false); }
  });

  $("#forgotBtn")?.addEventListener("click", async()=>{
    try{
      const email=$("#email").value.trim();
      if(!email) return showAlert("Enter your email first.");
      await auth.sendPasswordResetEmail(email);
      showAlert("Password reset email sent.", "success");
    }catch(e){ showAlert(e.message); }
  });
}

function setupProfile(){
  if(!$("#profileForm") || typeof firebase === "undefined") return;
  if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  auth.onAuthStateChanged(async user=>{
    if(!user) return;
    $("#profileEmail").textContent = user.email;
    const snap = await db.collection("profiles").doc(user.uid).get();
    if(snap.exists){
      const p = snap.data();
      ["fullName","headline","city","bio","summary","experience","skills","portfolioLinks","certificateLinks","resumeLink","profileImageUrl"].forEach(k=>{
        const el = $("#"+k); if(el) el.value = p[k] || "";
      });
      $("#avatarLetter").textContent = (p.fullName || user.email || "R")[0].toUpperCase();
      renderProfilePreview(p);
    }
  });

  $("#profileForm").addEventListener("submit", async(e)=>{
    e.preventDefault();
    const btn=$("#saveProfileBtn"); setLoading(btn,true,"Saving...");
    try{
      const user = auth.currentUser;
      if(!user) throw new Error("Please login first.");
      const data = {
        uid:user.uid,
        email:user.email,
        fullName:$("#fullName").value.trim(),
        headline:$("#headline").value.trim(),
        city:$("#city").value.trim(),
        bio:$("#bio").value.trim(),
        summary:$("#summary").value.trim(),
        experience:$("#experience").value.trim(),
        skills:$("#skills").value.trim(),
        portfolioLinks:$("#portfolioLinks").value.trim(),
        certificateLinks:$("#certificateLinks").value.trim(),
        resumeLink:$("#resumeLink").value.trim(),
        profileImageUrl:$("#profileImageUrl").value.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await db.collection("profiles").doc(user.uid).set(data,{merge:true});
      await db.collection("users").doc(user.uid).set({profileCompleted:true, updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
      showAlert("Profile saved successfully.", "success");
      showToast("Profile saved");
      $("#avatarLetter").textContent = (data.fullName || user.email || "R")[0].toUpperCase();
      renderProfilePreview(data);
    }catch(e){showAlert(e.message)}
    finally{setLoading(btn,false)}
  });
}

function renderProfilePreview(p){
  const box=$("#profilePreview");
  if(!box) return;
  const skillTags = (p.skills||"").split(",").map(s=>s.trim()).filter(Boolean).slice(0,8)
    .map(s=>`<span class="tag">${s}</span>`).join("");
  box.innerHTML = `
    <h3>${p.fullName || "Your Name"}</h3>
    <p class="muted">${p.headline || "Add your professional headline"}</p>
    <div class="tags">${skillTags || '<span class="tag">Add skills</span>'}</div>
    <div class="list" style="margin-top:18px">
      <div class="item"><strong>City:</strong> ${p.city || "-"}</div>
      <div class="item"><strong>Portfolio:</strong> ${linkify(p.portfolioLinks)}</div>
      <div class="item"><strong>Resume:</strong> ${linkify(p.resumeLink)}</div>
    </div>
  `;
}
function linkify(v){
  if(!v) return "-";
  const first = v.split(/\s|,/)[0];
  if(first.startsWith("http")) return `<a href="${first}" target="_blank" style="color:var(--accent)">Open link</a>`;
  return v;
}

function setupFilters(){
  const search=$("#searchInput"), cat=$("#categoryFilter"), budget=$("#budgetFilter");
  if(!search) return;
  function run(){
    const q=search.value.toLowerCase();
    const c=cat?.value || "";
    const b=budget?.value || "";
    let visible=0;
    $$(".job-card").forEach(card=>{
      const text=card.innerText.toLowerCase();
      const okQ=!q || text.includes(q);
      const okC=!c || card.dataset.category===c;
      const okB=!b || card.dataset.budget===b;
      const show=okQ&&okC&&okB;
      card.style.display=show?"block":"none";
      if(show) visible++;
    });
    const empty=$("#emptyState");
    if(empty) empty.style.display=visible?"none":"block";
  }
  [search,cat,budget].forEach(el=>el?.addEventListener("input",run));
  $$(".save-btn").forEach(btn=>btn.addEventListener("click",()=>{btn.textContent="Saved";showToast("Saved for later")}));
}


/* =========================
   V4 Job Posting + Apply
   ========================= */

document.addEventListener("DOMContentLoaded", () => {
  setupPostJob();
  loadLiveJobs();
});

function normalizeSkills(value){
  return (value || "").split(",").map(s => s.trim()).filter(Boolean);
}

function setupPostJob(){
  const form = document.querySelector("#postJobForm");
  if(!form || typeof firebase === "undefined") return;
  if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);

  const auth = firebase.auth();
  const db = firebase.firestore();

  auth.onAuthStateChanged(user => {
    if(!user){
      location.href = "login.html";
      return;
    }
    const emailEl = document.querySelector("#posterEmail");
    if(emailEl) emailEl.textContent = user.email;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.querySelector("#postJobBtn");
    setLoading(btn, true, "Posting job...");
    try{
      const user = auth.currentUser;
      if(!user) throw new Error("Please login first.");

      const job = {
        title: document.querySelector("#jobTitle").value.trim(),
        company: document.querySelector("#companyName").value.trim(),
        category: document.querySelector("#jobCategory").value,
        budgetRange: document.querySelector("#budgetRange").value,
        budgetText: document.querySelector("#budgetText").value.trim(),
        location: document.querySelector("#jobLocation").value.trim(),
        duration: document.querySelector("#duration").value.trim(),
        skills: normalizeSkills(document.querySelector("#jobSkills").value),
        description: document.querySelector("#jobDescription").value.trim(),
        requirements: document.querySelector("#requirements").value.trim(),
        status: "open",
        postedBy: user.uid,
        postedByEmail: user.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if(!job.title || !job.company || !job.description){
        throw new Error("Please fill title, company and description.");
      }

      await db.collection("jobs").add(job);
      showAlert("Job posted successfully. It will appear on Find Work.", "success");
      showToast("Job posted");
      form.reset();
    }catch(err){
      showAlert(err.message || "Could not post job.");
    }finally{
      setLoading(btn, false);
    }
  });
}

async function loadLiveJobs(){
  const liveGrid = document.querySelector("#liveJobsGrid");
  if(!liveGrid || typeof firebase === "undefined") return;
  if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);

  const db = firebase.firestore();

  try{
    liveGrid.innerHTML = `<div class="card empty-state"><h3>Loading live jobs...</h3><p class="muted">Fetching jobs from Firestore.</p></div>`;

    const snap = await db.collection("jobs")
      .where("status", "==", "open")
      .limit(20)
      .get();

    if(snap.empty){
      liveGrid.innerHTML = `<div class="card empty-state"><h3>No live jobs yet</h3><p class="muted">Post your first job from Post Job page. Demo jobs are shown below for preview.</p></div>`;
      return;
    }

    liveGrid.innerHTML = "";
    snap.forEach(doc => {
      const job = doc.data();
      const skills = Array.isArray(job.skills) ? job.skills : [];
      const card = document.createElement("div");
      card.className = "card job-card";
      card.dataset.category = job.category || "";
      card.dataset.budget = job.budgetRange || "";
      card.innerHTML = `
        <div class="job-head">
          <div>
            <span class="mini-label">${escapeHtml(job.company || "Company")}</span>
            <h3>${escapeHtml(job.title || "Untitled Job")}</h3>
          </div>
          <button class="btn btn-secondary save-btn" type="button">Save</button>
        </div>
        <p class="muted">${escapeHtml(job.description || "")}</p>
        <div class="meta-grid">
          <div class="meta-box"><span class="mini-label">Budget</span><strong>${escapeHtml(job.budgetText || job.budgetRange || "-")}</strong></div>
          <div class="meta-box"><span class="mini-label">Location</span><strong>${escapeHtml(job.location || "Remote")}</strong></div>
          <div class="meta-box"><span class="mini-label">Duration</span><strong>${escapeHtml(job.duration || "-")}</strong></div>
        </div>
        <div class="tags">${skills.slice(0,6).map(s => `<span class="tag">${escapeHtml(s)}</span>`).join("")}</div>
        <div class="row" style="margin-top:16px">
          <button class="btn btn-primary apply-job-btn" data-job-id="${doc.id}" type="button">Apply Now</button>
          <button class="btn btn-secondary view-job-btn" data-job-id="${doc.id}" type="button">View Details</button>
        </div>
      `;
      liveGrid.appendChild(card);
    });

    document.querySelectorAll(".apply-job-btn").forEach(btn => {
      btn.addEventListener("click", () => applyToJob(btn.dataset.jobId, btn));
    });

    document.querySelectorAll(".view-job-btn").forEach(btn => {
      btn.addEventListener("click", () => showToast("Detailed job page will come in next build."));
    });

    document.querySelectorAll(".save-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        btn.textContent = "Saved";
        showToast("Saved for later");
      });
    });

  }catch(err){
    liveGrid.innerHTML = `<div class="card empty-state"><h3>Could not load jobs</h3><p class="muted">${escapeHtml(err.message)}</p></div>`;
  }
}

async function applyToJob(jobId, btn){
  if(typeof firebase === "undefined") return;
  if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);

  const auth = firebase.auth();
  const db = firebase.firestore();
  const user = auth.currentUser;

  if(!user){
    location.href = "login.html";
    return;
  }

  setLoading(btn, true, "Applying...");
  try{
    const profileSnap = await db.collection("profiles").doc(user.uid).get();
    const profile = profileSnap.exists ? profileSnap.data() : {};

    await db.collection("applications").add({
      jobId,
      applicantUid: user.uid,
      applicantEmail: user.email,
      applicantName: profile.fullName || "",
      headline: profile.headline || "",
      status: "submitted",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    btn.textContent = "Applied";
    btn.disabled = true;
    showToast("Application submitted");
  }catch(err){
    showToast(err.message || "Could not apply");
    setLoading(btn, false);
  }
}

function escapeHtml(value){
  return String(value || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}


/* =========================
   V5 Employer + Applications
   ========================= */

document.addEventListener("DOMContentLoaded", () => {
  loadEmployerDashboard();
  loadMyApplications();
});

async function loadEmployerDashboard(){
  const jobsWrap = document.querySelector("#employerJobs");
  if(!jobsWrap || typeof firebase === "undefined") return;
  if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);

  const auth = firebase.auth();
  const db = firebase.firestore();

  auth.onAuthStateChanged(async user => {
    if(!user){
      location.href = "login.html";
      return;
    }

    jobsWrap.innerHTML = `<div class="card empty-state"><h3>Loading your posted jobs...</h3><p class="muted">Checking Firestore jobs.</p></div>`;

    try{
      const snap = await db.collection("jobs")
        .where("postedBy", "==", user.uid)
        .limit(30)
        .get();

      if(snap.empty){
        jobsWrap.innerHTML = `<div class="card empty-state"><h3>No jobs posted yet</h3><p class="muted">Post your first job and applicants will appear here.</p><a class="btn btn-primary" href="post-job.html">Post Job</a></div>`;
        return;
      }

      jobsWrap.innerHTML = "";
      for(const doc of snap.docs){
        const job = doc.data();
        const appsSnap = await db.collection("applications")
          .where("jobId", "==", doc.id)
          .limit(50)
          .get();

        const appRows = appsSnap.empty
          ? `<div class="item">No applications yet.</div>`
          : appsSnap.docs.map(a => {
              const app = a.data();
              return `<div class="item applicant-row">
                <div>
                  <strong>${escapeHtml(app.applicantName || app.applicantEmail || "Applicant")}</strong>
                  <p class="muted">${escapeHtml(app.headline || app.applicantEmail || "")}</p>
                  <span class="tag">${escapeHtml(app.status || "submitted")}</span>
                </div>
                <div class="row">
                  <a class="btn btn-secondary" href="profile-view.html?id=${escapeHtml(app.applicantUid || '')}">View Profile</a>
                  <button class="btn btn-secondary app-status-btn" data-app-id="${a.id}" data-status="shortlisted">Shortlist</button>
                  <button class="btn btn-danger app-status-btn" data-app-id="${a.id}" data-status="rejected">Reject</button>
                </div>
              </div>`;
            }).join("");

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
          <div class="job-head">
            <div>
              <span class="mini-label">${escapeHtml(job.company || "Company")}</span>
              <h3>${escapeHtml(job.title || "Untitled job")}</h3>
              <p class="muted">${escapeHtml(job.description || "")}</p>
            </div>
            <span class="tag">${appsSnap.size} applicants</span>
          </div>
          <div class="meta-grid">
            <div class="meta-box"><span class="mini-label">Budget</span><strong>${escapeHtml(job.budgetText || "-")}</strong></div>
            <div class="meta-box"><span class="mini-label">Location</span><strong>${escapeHtml(job.location || "-")}</strong></div>
            <div class="meta-box"><span class="mini-label">Status</span><strong>${escapeHtml(job.status || "open")}</strong></div>
          </div>
          <h3 style="margin-top:18px">Applicants</h3>
          <div class="list">${appRows}</div>
        `;
        jobsWrap.appendChild(card);
      }

      document.querySelectorAll(".app-status-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          setLoading(btn, true, "Saving...");
          try{
            await db.collection("applications").doc(btn.dataset.appId).set({
              status: btn.dataset.status,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge:true });
            showToast("Application marked " + btn.dataset.status);
            setTimeout(()=>location.reload(), 700);
          }catch(err){
            showToast(err.message || "Status update failed");
            setLoading(btn, false);
          }
        });
      });

    }catch(err){
      jobsWrap.innerHTML = `<div class="card empty-state"><h3>Could not load employer dashboard</h3><p class="muted">${escapeHtml(err.message)}</p></div>`;
    }
  });
}

async function loadMyApplications(){
  const wrap = document.querySelector("#myApplications");
  if(!wrap || typeof firebase === "undefined") return;
  if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);

  const auth = firebase.auth();
  const db = firebase.firestore();

  auth.onAuthStateChanged(async user => {
    if(!user){
      location.href = "login.html";
      return;
    }

    wrap.innerHTML = `<div class="card empty-state"><h3>Loading your applications...</h3></div>`;

    try{
      const snap = await db.collection("applications")
        .where("applicantUid", "==", user.uid)
        .limit(50)
        .get();

      if(snap.empty){
        wrap.innerHTML = `<div class="card empty-state"><h3>No applications yet</h3><p class="muted">Apply to jobs from the Find Work page.</p><a class="btn btn-primary" href="freelancer-dashboard.html">Find Work</a></div>`;
        return;
      }

      wrap.innerHTML = "";
      for(const appDoc of snap.docs){
        const app = appDoc.data();
        let job = {};
        try{
          const jobSnap = await db.collection("jobs").doc(app.jobId).get();
          if(jobSnap.exists) job = jobSnap.data();
        }catch(e){}

        const card = document.createElement("div");
        card.className = "card job-card";
        card.innerHTML = `
          <div class="job-head">
            <div>
              <span class="mini-label">${escapeHtml(job.company || "Company")}</span>
              <h3>${escapeHtml(job.title || "Job application")}</h3>
            </div>
            <span class="tag">${escapeHtml(app.status || "submitted")}</span>
          </div>
          <p class="muted">${escapeHtml(job.description || "Application saved in Firestore.")}</p>
          <div class="meta-grid">
            <div class="meta-box"><span class="mini-label">Budget</span><strong>${escapeHtml(job.budgetText || "-")}</strong></div>
            <div class="meta-box"><span class="mini-label">Location</span><strong>${escapeHtml(job.location || "-")}</strong></div>
            <div class="meta-box"><span class="mini-label">Status</span><strong>${escapeHtml(app.status || "submitted")}</strong></div>
          </div>
        `;
        wrap.appendChild(card);
      }

    }catch(err){
      wrap.innerHTML = `<div class="card empty-state"><h3>Could not load applications</h3><p class="muted">${escapeHtml(err.message)}</p></div>`;
    }
  });
}


/* V5.1 Clean navbar dropdown */
document.addEventListener("DOMContentLoaded", () => {
  const dropBtn = document.querySelector(".nav-drop-btn");
  const dropMenu = document.querySelector(".nav-drop-menu");
  if(dropBtn && dropMenu){
    dropBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropMenu.classList.toggle("open");
    });
    document.addEventListener("click", () => dropMenu.classList.remove("open"));
  }
  const page = location.pathname.split("/").pop() || "index.html";
  const dashboardPages = ["profile.html","post-job.html","employer-dashboard.html","my-applications.html"];
  if(dashboardPages.includes(page)){
    document.querySelector(".nav-drop-btn")?.classList.add("active");
  }
});


/* =========================
   V6 Public Profile + Navbar User Identity
   ========================= */

document.addEventListener("DOMContentLoaded", () => {
  enhanceNavbarUserIdentity();
  loadPublicProfile();
});

function initialsFromName(name, fallback="R"){
  const clean = (name || "").trim();
  if(!clean) return fallback[0]?.toUpperCase() || "R";
  const parts = clean.split(/\s+/);
  if(parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean[0].toUpperCase();
}

function avatarHtml(profile, sizeClass="nav-avatar"){
  const name = profile?.fullName || profile?.email || "User";
  const img = (profile?.profileImageUrl || "").trim();
  if(img && img.startsWith("http")){
    return `<img class="${sizeClass}" src="${escapeHtml(img)}" alt="${escapeHtml(name)}">`;
  }
  return `<span class="${sizeClass} avatar-fallback">${escapeHtml(initialsFromName(name))}</span>`;
}

async function getCurrentUserProfile(uid){
  if(typeof firebase === "undefined") return null;
  if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const snap = await db.collection("profiles").doc(uid).get();
  return snap.exists ? snap.data() : null;
}

function enhanceNavbarUserIdentity(){
  if(typeof firebase === "undefined") return;
  if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  auth.onAuthStateChanged(async user => {
    const badge = document.querySelector("#userBadge");
    if(!badge || !user) return;

    try{
      const profileSnap = await db.collection("profiles").doc(user.uid).get();
      const profile = profileSnap.exists ? profileSnap.data() : {};
      const displayName = profile.fullName || (user.email ? user.email.split("@")[0] : "User");
      badge.innerHTML = `${avatarHtml({...profile, email:user.email})}<span>${escapeHtml(displayName)}</span>`;
      badge.href = "profile.html";
      badge.classList.add("user-mini-card");
    }catch(e){
      const fallback = user.email ? user.email.split("@")[0] : "User";
      badge.innerHTML = `<span class="nav-avatar avatar-fallback">${escapeHtml(initialsFromName(fallback))}</span><span>${escapeHtml(fallback)}</span>`;
      badge.href = "profile.html";
      badge.classList.add("user-mini-card");
    }
  });
}

async function loadPublicProfile(){
  const holder = document.querySelector("#publicProfile");
  if(!holder || typeof firebase === "undefined") return;
  if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);

  const params = new URLSearchParams(location.search);
  const uid = params.get("id");
  const auth = firebase.auth();
  const db = firebase.firestore();

  async function render(uidToLoad){
    if(!uidToLoad){
      holder.innerHTML = `<div class="card empty-state"><h3>No profile selected</h3><p class="muted">Open this page from Employer Dashboard or add ?id=USER_UID.</p><a class="btn btn-primary" href="profile.html">My Profile</a></div>`;
      return;
    }

    try{
      const snap = await db.collection("profiles").doc(uidToLoad).get();
      if(!snap.exists){
        holder.innerHTML = `<div class="card empty-state"><h3>Profile not completed</h3><p class="muted">This user has not saved a public profile yet.</p></div>`;
        return;
      }

      const p = snap.data();
      const skills = (p.skills || "").split(",").map(s=>s.trim()).filter(Boolean);
      const portfolios = (p.portfolioLinks || "").split(/\n|,/).map(s=>s.trim()).filter(Boolean);
      const certs = (p.certificateLinks || "").split(/\n|,/).map(s=>s.trim()).filter(Boolean);

      holder.innerHTML = `
        <section class="public-profile-hero card">
          <div class="public-avatar-wrap">${avatarHtml(p, "public-avatar")}</div>
          <div>
            <span class="eyebrow">Public Profile</span>
            <h2>${escapeHtml(p.fullName || "Unnamed Profile")}</h2>
            <p class="public-headline">${escapeHtml(p.headline || "Professional on RozgarBridge")}</p>
            <div class="tags">${skills.slice(0,10).map(s=>`<span class="tag">${escapeHtml(s)}</span>`).join("") || '<span class="tag">Skills not added</span>'}</div>
          </div>
        </section>

        <div class="profile-public-grid">
          <div class="card">
            <h3>Bio</h3>
            <p class="muted">${escapeHtml(p.bio || "No bio added yet.")}</p>
            <h3 style="margin-top:22px">Summary</h3>
            <p class="muted">${escapeHtml(p.summary || "No summary added yet.")}</p>
          </div>

          <div class="card">
            <h3>Quick Info</h3>
            <div class="list">
              <div class="item"><strong>Email:</strong> ${escapeHtml(p.email || "-")}</div>
              <div class="item"><strong>City:</strong> ${escapeHtml(p.city || "-")}</div>
              <div class="item"><strong>Resume:</strong> ${renderLinks(p.resumeLink ? [p.resumeLink] : [])}</div>
            </div>
          </div>

          <div class="card">
            <h3>Experience</h3>
            <p class="muted pre-line">${escapeHtml(p.experience || "No experience added yet.")}</p>
          </div>

          <div class="card">
            <h3>Portfolio Links</h3>
            ${renderLinks(portfolios)}
            <h3 style="margin-top:22px">Certificate Links</h3>
            ${renderLinks(certs)}
          </div>
        </div>
      `;
    }catch(e){
      holder.innerHTML = `<div class="card empty-state"><h3>Could not load profile</h3><p class="muted">${escapeHtml(e.message)}</p></div>`;
    }
  }

  if(uid) return render(uid);

  auth.onAuthStateChanged(user => render(user?.uid));
}

function renderLinks(links){
  if(!links || !links.length) return `<p class="muted">No links added.</p>`;
  return `<div class="list">${links.map((l,i)=>{
    const safe = escapeHtml(l);
    const href = l.startsWith("http") ? safe : "#";
    return `<a class="item link-card" href="${href}" target="_blank"><strong>Open Link ${i+1}</strong><span>${safe}</span></a>`;
  }).join("")}</div>`;
}


/* =========================
   V7 Clean Feature Pack
   ========================= */
document.addEventListener("DOMContentLoaded", () => {
  setupThemeToggle();
  setupSavedJobsPage();
  setupCompanyPage();
  setupMessagesPage();
  setupAdminPanel();
  setupAdvancedFilters();
});

function setupThemeToggle(){
  const btn = document.querySelector("#themeToggle");
  const saved = localStorage.getItem("rb-theme") || "dark";
  document.body.classList.toggle("light-theme", saved === "light");
  if(btn) btn.textContent = saved === "light" ? "Dark" : "Light";

  btn?.addEventListener("click", () => {
    const next = document.body.classList.contains("light-theme") ? "dark" : "light";
    document.body.classList.toggle("light-theme", next === "light");
    localStorage.setItem("rb-theme", next);
    btn.textContent = next === "light" ? "Dark" : "Light";
  });
}

async function saveJobToFirestore(jobId, jobTitle="Saved job"){
  if(typeof firebase === "undefined") return showToast("Firebase not loaded");
  if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  const user = auth.currentUser;
  if(!user){ location.href = "login.html"; return; }

  await db.collection("savedJobs").doc(user.uid + "_" + jobId).set({
    userId:user.uid,
    jobId,
    jobTitle,
    createdAt:firebase.firestore.FieldValue.serverTimestamp()
  },{merge:true});
  showToast("Job saved");
}

function setupAdvancedFilters(){
  const locationFilter = document.querySelector("#locationFilter");
  const skillFilter = document.querySelector("#skillFilter");
  if(!locationFilter && !skillFilter) return;

  function runExtra(){
    const loc = (locationFilter?.value || "").toLowerCase();
    const skill = (skillFilter?.value || "").toLowerCase();
    document.querySelectorAll(".job-card").forEach(card => {
      const text = card.innerText.toLowerCase();
      const okLoc = !loc || text.includes(loc);
      const okSkill = !skill || text.includes(skill);
      if(card.style.display !== "none"){
        card.style.display = okLoc && okSkill ? "block" : "none";
      }
    });
  }
  [locationFilter, skillFilter].forEach(el => el?.addEventListener("input", runExtra));

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".save-btn");
    if(!btn) return;
    const card = btn.closest(".job-card");
    const title = card?.querySelector("h3")?.textContent || "Saved job";
    const id = btn.dataset.jobId || title.toLowerCase().replace(/\W+/g,"-");
    try{
      await saveJobToFirestore(id, title);
      btn.textContent = "Saved";
    }catch(err){ showToast(err.message || "Could not save job"); }
  });
}

function setupSavedJobsPage(){
  const wrap = document.querySelector("#savedJobsList");
  if(!wrap || typeof firebase === "undefined") return;
  if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);

  const auth = firebase.auth();
  const db = firebase.firestore();

  auth.onAuthStateChanged(async user => {
    if(!user){ location.href = "login.html"; return; }
    wrap.innerHTML = `<div class="card empty-state"><h3>Loading saved jobs...</h3></div>`;

    try{
      const snap = await db.collection("savedJobs").where("userId","==",user.uid).limit(50).get();
      if(snap.empty){
        wrap.innerHTML = `<div class="card empty-state"><h3>No saved jobs yet</h3><p class="muted">Save jobs from Find Work page.</p><a class="btn btn-primary" href="freelancer-dashboard.html">Find Work</a></div>`;
        return;
      }
      wrap.innerHTML = "";
      snap.forEach(doc => {
        const s = doc.data();
        const card = document.createElement("div");
        card.className = "card job-card";
        card.innerHTML = `<div class="job-head"><div><span class="mini-label">Saved Job</span><h3>${escapeHtml(s.jobTitle || "Saved job")}</h3></div><span class="tag">Saved</span></div><p class="muted">Job ID: ${escapeHtml(s.jobId || "-")}</p><a class="btn btn-primary" href="freelancer-dashboard.html">Open Jobs</a>`;
        wrap.appendChild(card);
      });
    }catch(err){
      wrap.innerHTML = `<div class="card empty-state"><h3>Could not load saved jobs</h3><p class="muted">${escapeHtml(err.message)}</p></div>`;
    }
  });
}

function setupCompanyPage(){
  const wrap = document.querySelector("#companyPage");
  if(!wrap || typeof firebase === "undefined") return;
  if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);

  const params = new URLSearchParams(location.search);
  const name = params.get("name") || "RozgarBridge Partner";
  wrap.innerHTML = `
    <section class="card public-profile-hero">
      <div class="public-avatar avatar-fallback">C</div>
      <div>
        <span class="eyebrow">Company Page</span>
        <h2>${escapeHtml(name)}</h2>
        <p class="public-headline">Company profile pages are ready as a clean base. Next we can connect this to Firestore company profiles.</p>
        <div class="tags"><span class="tag">Hiring</span><span class="tag">Verified soon</span><span class="tag">India</span></div>
      </div>
    </section>
    <div class="grid-2">
      <div class="card"><h3>About Company</h3><p class="muted">Add company intro, website, industry, team size and location here.</p></div>
      <div class="card"><h3>Open Roles</h3><p class="muted">Company-specific jobs will appear here in a future Firestore query.</p><a class="btn btn-primary" href="freelancer-dashboard.html">View All Jobs</a></div>
    </div>
  `;
}

function setupMessagesPage(){
  const form = document.querySelector("#messageForm");
  if(!form || typeof firebase === "undefined") return;
  if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  auth.onAuthStateChanged(user => {
    if(!user) location.href = "login.html";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if(!user) return;
    const btn = document.querySelector("#sendMessageBtn");
    setLoading(btn,true,"Sending...");
    try{
      await db.collection("messages").add({
        fromUid:user.uid,
        fromEmail:user.email,
        toEmail:document.querySelector("#toEmail").value.trim(),
        subject:document.querySelector("#messageSubject").value.trim(),
        message:document.querySelector("#messageBody").value.trim(),
        status:"sent",
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
      showAlert("Message saved successfully. Full inbox can be added next.", "success");
      form.reset();
    }catch(err){ showAlert(err.message); }
    finally{ setLoading(btn,false); }
  });
}

function setupAdminPanel(){
  const wrap = document.querySelector("#adminStats");
  if(!wrap || typeof firebase === "undefined") return;
  if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);

  const auth = firebase.auth();
  const db = firebase.firestore();

  auth.onAuthStateChanged(async user => {
    if(!user){ location.href="login.html"; return; }
    wrap.innerHTML = `<div class="card empty-state"><h3>Loading admin overview...</h3></div>`;
    try{
      const [users, profiles, jobs, apps] = await Promise.all([
        db.collection("users").limit(100).get(),
        db.collection("profiles").limit(100).get(),
        db.collection("jobs").limit(100).get(),
        db.collection("applications").limit(100).get()
      ]);
      wrap.innerHTML = `
        <div class="metric-grid">
          <div class="metric"><span class="mini-label">Users</span><strong>${users.size}</strong></div>
          <div class="metric"><span class="mini-label">Profiles</span><strong>${profiles.size}</strong></div>
          <div class="metric"><span class="mini-label">Jobs</span><strong>${jobs.size}</strong></div>
        </div>
        <div class="metric-grid" style="margin-top:12px">
          <div class="metric"><span class="mini-label">Applications</span><strong>${apps.size}</strong></div>
          <div class="metric"><span class="mini-label">Messages</span><strong>Base</strong></div>
          <div class="metric"><span class="mini-label">Status</span><strong>MVP</strong></div>
        </div>
        <div class="card" style="margin-top:18px"><h3>Admin note</h3><p class="muted">This is a clean admin overview base. Later we can restrict access to only your email using Firestore rules/custom role.</p></div>
      `;
    }catch(err){
      wrap.innerHTML = `<div class="card empty-state"><h3>Admin data blocked</h3><p class="muted">${escapeHtml(err.message)}</p></div>`;
    }
  });
}


/* V7.1 Clean LinkedIn-inspired layout */
document.addEventListener("DOMContentLoaded", () => {
  setupCleanSettingsMenu();
  setupMessagePanel();
  updateProfileSidebar();
});

function setupCleanSettingsMenu(){
  const btn = document.querySelector("#settingsBtn");
  const menu = document.querySelector("#settingsMenu");
  btn?.addEventListener("click", (e) => {
    e.stopPropagation();
    menu?.classList.toggle("open");
  });
  document.addEventListener("click", () => menu?.classList.remove("open"));

  document.querySelector("#quickPasswordReset")?.addEventListener("click", async () => {
    try{
      if(typeof firebase === "undefined") return;
      if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
      const user = firebase.auth().currentUser;
      if(!user?.email) return showToast("Login first");
      await firebase.auth().sendPasswordResetEmail(user.email);
      showToast("Password reset email sent");
    }catch(e){ showToast(e.message || "Could not send reset email"); }
  });
}

function setupMessagePanel(){
  const btn = document.querySelector("#messageBubbleBtn");
  const panel = document.querySelector("#messagePanel");
  const close = document.querySelector("#closeMessagePanel");
  btn?.addEventListener("click", () => panel?.classList.toggle("open"));
  close?.addEventListener("click", () => panel?.classList.remove("open"));
}

function updateProfileSidebar(){
  const sideName = document.querySelector("#sideName");
  if(!sideName || typeof firebase === "undefined") return;
  if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  auth.onAuthStateChanged(async user => {
    if(!user) return;
    try{
      const snap = await db.collection("profiles").doc(user.uid).get();
      const p = snap.exists ? snap.data() : {};
      document.querySelector("#sideName").textContent = p.fullName || user.email?.split("@")[0] || "My Profile";
      document.querySelector("#sideHeadline").textContent = p.headline || "Complete your profile";
      const av = document.querySelector("#sideAvatar");
      if(av){
        if(p.profileImageUrl && p.profileImageUrl.startsWith("http")){
          av.innerHTML = `<img src="${escapeHtml(p.profileImageUrl)}" alt="Profile">`;
          av.classList.add("has-img");
        }else{
          av.textContent = initialsFromName(p.fullName || user.email || "R");
        }
      }
    }catch(e){}
  });
}


/* V7.2 LinkedIn-style message dock */
document.addEventListener("DOMContentLoaded", () => {
  setupLinkedInStyleMessageDock();
});

function setupLinkedInStyleMessageDock(){
  const panel = document.querySelector("#messagePanel");
  const btn = document.querySelector("#messageBubbleBtn");
  const close = document.querySelector("#closeMessagePanel");
  const openFull = document.querySelector("#openMessagesPage");
  const search = document.querySelector("#messageSearch");

  if(!panel) return;

  const savedState = localStorage.getItem("rb-msg-dock") || "open";
  panel.classList.toggle("collapsed", savedState === "collapsed");

  btn?.addEventListener("click", () => {
    panel.classList.remove("collapsed");
    panel.classList.add("open");
    localStorage.setItem("rb-msg-dock", "open");
  });

  close?.addEventListener("click", () => {
    panel.classList.toggle("collapsed");
    localStorage.setItem("rb-msg-dock", panel.classList.contains("collapsed") ? "collapsed" : "open");
  });

  openFull?.addEventListener("click", () => {
    location.href = "messages.html";
  });

  document.querySelectorAll("[data-msg-tab]").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("[data-msg-tab]").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      showToast(tab.textContent.trim() + " messages");
    });
  });

  search?.addEventListener("input", () => {
    const q = search.value.toLowerCase();
    document.querySelectorAll(".dock-chat").forEach(chat => {
      chat.style.display = chat.innerText.toLowerCase().includes(q) ? "grid" : "none";
    });
  });
}


/* V8 brand theme dropdowns */
document.addEventListener("DOMContentLoaded", () => {
  setupV8Dropdowns();
  setupV8Identity();
});

function setupV8Dropdowns(){
  const profileBtn = document.querySelector("#profileDropBtn");
  const profileMenu = document.querySelector("#profileDropdown");
  const notifBtn = document.querySelector("#notificationBtn");
  const notifPanel = document.querySelector("#notificationPanel");

  profileBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    profileMenu?.classList.toggle("open");
    notifPanel?.classList.remove("open");
  });
  notifBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    notifPanel?.classList.toggle("open");
    profileMenu?.classList.remove("open");
  });
  document.addEventListener("click", () => {
    profileMenu?.classList.remove("open");
    notifPanel?.classList.remove("open");
  });
  profileMenu?.addEventListener("click", e => e.stopPropagation());
  notifPanel?.addEventListener("click", e => e.stopPropagation());
  document.querySelector("#markReadBtn")?.addEventListener("click", () => showToast("Notifications marked as read"));
}

async function setupV8Identity(){
  if(typeof firebase === "undefined") return;
  if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  auth.onAuthStateChanged(async user => {
    const chip = document.querySelector("#profileDropBtn");
    const login = document.querySelector("#loginLink");
    if(!user){
      if(chip) chip.style.display = "none";
      if(login) login.style.display = "inline-flex";
      return;
    }
    if(chip) chip.style.display = "inline-flex";
    if(login) login.style.display = "none";
    let p = {};
    try{
      const snap = await db.collection("profiles").doc(user.uid).get();
      if(snap.exists) p = snap.data();
    }catch(e){}
    const name = p.fullName || user.email?.split("@")[0] || "Me";
    const headline = p.headline || "Complete your profile";
    const avatarUrl = (p.profileImageUrl || "").trim();
    const initials = initialsFromName(name);

    const navName = document.querySelector("#navName");
    if(navName) navName.textContent = name;

    ["#navAvatar","#dropAvatar"].forEach(sel => {
      const av = document.querySelector(sel);
      if(!av) return;
      if(avatarUrl && avatarUrl.startsWith("http")){
        av.innerHTML = `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}">`;
        av.classList.add("has-img");
      }else{
        av.textContent = initials;
      }
    });

    const dn = document.querySelector("#dropName");
    const dh = document.querySelector("#dropHeadline");
    if(dn) dn.textContent = name;
    if(dh) dh.textContent = headline;
  });
}


/* Admin lock: only allowed admin email can open admin.html */
document.addEventListener("DOMContentLoaded", () => {
  const isAdminPage = location.pathname.includes("admin.html");
  if (!isAdminPage || typeof firebase === "undefined") return;

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

  firebase.auth().onAuthStateChanged((user) => {
    const allowedAdmin = "ankitchaubeyy@gmail.com";

    if (!user || user.email !== allowedAdmin) {
      document.body.innerHTML = `
      <main class="auth-shell">
        <div class="card auth-card">
          <span class="eyebrow">Access Denied</span>
          <h2>Admin Only</h2>
          <p>You don't have permission to access this page.</p>
          <a class="btn btn-primary" href="home.html">Go Home</a>
        </div>
      </main>
      `;
    }
  });
});


/* V8.3.1 mobile-only message dock default collapsed */
document.addEventListener("DOMContentLoaded", () => {
  const panel = document.querySelector("#messagePanel");
  if (!panel) return;

  const isMobile = window.matchMedia("(max-width: 860px)").matches;
  if (isMobile && !localStorage.getItem("rb-msg-dock")) {
    panel.classList.add("collapsed");
  }
});
