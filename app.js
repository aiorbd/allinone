// ---------------------- Firebase Config ----------------------
const firebaseConfig = {
  apiKey: "AIzaSyCkLQ5vf1z9dYjAVcOo7tm0BRT8N7jAbOw",
  authDomain: "ratul-liv.firebaseapp.com",
  databaseURL: "https://ratul-liv-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ratul-liv",
  storageBucket: "ratul-liv.appspot.com",
  messagingSenderId: "395032456768",
  appId: "1:395032456768:web:eadef753d410c71c5439a5"
};
firebase.initializeApp(firebaseConfig);

// ---------------------- Helpers ----------------------
function q(id) { return document.getElementById(id); }
function el(tag, cls) { const e = document.createElement(tag); if(cls) e.className = cls; return e; }
function toDateSafe(str) { return str ? new Date(str) : new Date(); }
function isLive(m) { return m.status === "live"; }
function isEnded(m) { return m.status === "ended"; }
function isUpcoming(m) { return m.status === "upcoming"; }
function normStatus(s) { return s.toLowerCase(); }
function formatCountdown(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;
}
function formatDateTimeBD(date) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const bdTime = new Date(utc + 6 * 60 * 60 * 1000);

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const dayName = days[bdTime.getDay()];
  const monthName = months[bdTime.getMonth()];
  const day = bdTime.getDate();
  const year = bdTime.getFullYear();

  let hours = bdTime.getHours();
  const minutes = bdTime.getMinutes().toString().padStart(2, "0");
  const seconds = bdTime.getSeconds().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  hours = hours.toString().padStart(2, "0");

  return `${dayName}, ${day} ${monthName} ${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
}
function formatDateTime12h(date) {
  const options = {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    timeZone: "Asia/Dhaka"
  };
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

// ---------------------- Render Matches ----------------------
function renderMatches() {
  const container = q("matches-section");
  if (!container) return;
  container.innerHTML = "";

  Object.values(window.APP.countdowns).forEach(id => clearInterval(id));
  window.APP.countdowns = {};

  const tab = window.APP.currentTab;
  const all = [...window.APP.matches.cricket, ...window.APP.matches.football];
  let list = [];

  if (tab === "all") {
    list = [
      ...all.filter(isLive),
      ...all.filter(isUpcoming).sort((a,b)=>toDateSafe(a.startTime)-toDateSafe(b.startTime)),
      ...all.filter(isEnded).sort((a,b)=>toDateSafe(b.startTime)-toDateSafe(a.startTime))
    ];
  } else if(tab==="live") list = all.filter(isLive);
  else if(tab==="upcoming") list = all.filter(isUpcoming).sort((a,b)=>toDateSafe(a.startTime)-toDateSafe(b.startTime));
  else if(tab==="recent") list = all.filter(isEnded).sort((a,b)=>toDateSafe(b.startTime)-toDateSafe(a.startTime));

  if(!list.length){
    container.innerHTML = `<div class="no-matches"><h3>No matches</h3></div>`;
    updateTabCounts();
    return;
  }

  list.forEach(match=>{
    const startTime = toDateSafe(match.startTime);
    const endTime = match.endTime ? toDateSafe(match.endTime) : null;

    const card = el("div","match-card");
    const comp = el("div","match-competition"); comp.textContent = match.title;
    const row = el("div","match-row");

    // Team 1
    const left = el("div","match-team");
    const t1img = el("img"); t1img.src = match.team1.logo; left.appendChild(t1img);
    const t1name = el("span"); t1name.textContent = match.team1.name; left.appendChild(t1name);

    // Team 2
    const right = el("div","match-team"); right.style.justifyContent="flex-end";
    const t2name = el("span"); t2name.textContent = match.team2.name;
    const t2img = el("img"); t2img.src = match.team2.logo; right.appendChild(t2name); right.appendChild(t2img);

    const statusEl = el("div",`match-status ${normStatus(match.status)}`);
    row.appendChild(left); row.appendChild(statusEl); row.appendChild(right);
    card.appendChild(comp); card.appendChild(row);

    card.addEventListener("click",()=>loadMatch(match));
    container.appendChild(card);

    if(isUpcoming(match)){
      const countdownId = setInterval(()=>{
        const diff = startTime.getTime() - Date.now();
        const twelveHours = 12*60*60*1000;
        if(diff<=0){
          clearInterval(countdownId);
          match.status="live"; renderMatches(); updateTabCounts(); return;
        }
        if(diff>twelveHours){
          statusEl.textContent = `Starts at ${formatDateTime12h(startTime)}`;
          statusEl.style.whiteSpace="pre";
        } else {
          statusEl.textContent = formatCountdown(diff);
          statusEl.style.whiteSpace="normal";
        }
      },1000);
      window.APP.countdowns[match.id]=countdownId;
    }

    if(isLive(match)&&endTime){
      const endId = setInterval(()=>{
        const nowDiff=endTime.getTime()-Date.now();
        if(nowDiff<=0){ clearInterval(endId); match.status="ended"; renderMatches(); updateTabCounts(); }
        else { statusEl.textContent="LIVE"; statusEl.classList.toggle("blink"); }
      },500);
    } else if(isLive(match)&&!endTime){
      statusEl.textContent="LIVE"; statusEl.classList.add("blink");
    }

    if(isEnded(match)){
      statusEl.textContent="ENDED"; statusEl.classList.remove("blink");
    }
  });

  updateTabCounts();
}

// ---------------------- Update Tab Counts ----------------------
function updateTabCounts(){
  const allBtn=document.querySelector('.tab-btn[data-filter="all"] .count');
  const liveBtn=document.querySelector('.tab-btn[data-filter="live"] .count');
  const recentBtn=document.querySelector('.tab-btn[data-filter="recent"] .count');
  const upcomingBtn=document.querySelector('.tab-btn[data-filter="upcoming"] .count');
  const all = [...window.APP.matches.cricket,...window.APP.matches.football];
  if(allBtn) allBtn.textContent=`(${all.length})`;
  if(liveBtn) liveBtn.textContent=`(${all.filter(isLive).length})`;
  if(recentBtn) recentBtn.textContent=`(${all.filter(isEnded).length})`;
  if(upcomingBtn) upcomingBtn.textContent=`(${all.filter(isUpcoming).length})`;
}

// ---------------------- Destroy Old Player ----------------------

// ---------------------- Load & Play Match ----------------------
async function loadMatch(match){
  window.APP.lastMatch = match;
  const videoSection = q("videoSection");
  const wrapper = q("player-wrapper");
  const serverRow = q("serverRow");
  const titleEl = q("videoTitle");
  if(!videoSection||!wrapper||!serverRow||!titleEl) return;

  videoSection.style.display = "block";
  serverRow.innerHTML = "";
  titleEl.textContent = match.title || "Untitled";

  const streams = Array.isArray(match.streams) ? match.streams.filter(Boolean) : [];
  if(!streams.length) return;

  streams.forEach((s, i) => {
    const btn = el("button", "server-btn");
    btn.type = "button";
    btn.textContent = s.name || `Server ${i+1}`;
    btn.dataset.index = i;

    btn.addEventListener("click", async () => {
      serverRow.querySelectorAll(".server-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");

      // Save stream to localStorage for fast play
      try{
        const cacheKey = "lastStream_"+match.id;
        localStorage.setItem(cacheKey, JSON.stringify(s));
      }catch(e){console.warn("Stream cache failed",e);}

      await playStream(s); // attach to same player
    });

    serverRow.appendChild(btn);
  });

  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.gap = "8px";

  // Activate first server or load cached stream
  const cacheKey = "lastStream_"+match.id;
  let cachedStream = null;
  try{ cachedStream = JSON.parse(localStorage.getItem(cacheKey)); }catch(e){}

  if(cachedStream){
    const index = streams.findIndex(st=>st.url===cachedStream.url);
    if(index>=0){
      const btn = serverRow.querySelector(`.server-btn[data-index="${index}"]`);
      if(btn) btn.click();
    } else serverRow.querySelector(".server-btn")?.click();
  } else serverRow.querySelector(".server-btn")?.click();
}

/// ---------------------- Play Stream on Same Player ----------------------
async function playStream(stream){
  const video = q("video");
  const videoContainer = q("video-container");
  if(!video || !videoContainer) return;

  // ---------------------- Iframe handling ----------------------
  if(stream.type === "iframe"){
    videoContainer.innerHTML = "";
    const iframe = el("iframe");
    iframe.src = stream.url;
    iframe.allowFullscreen = true;
    iframe.frameBorder = "0";
    iframe.style.width = "100%";
    iframe.style.aspectRatio = "16/9";
    iframe.style.borderRadius = "12px";
    videoContainer.appendChild(iframe);
    return;
  }

  // Remove old iframe if exists
  const oldIframe = videoContainer.querySelector("iframe");
  if(oldIframe) oldIframe.remove();
  if(!videoContainer.contains(video)) videoContainer.appendChild(video);

  // ---------------------- Stable UI Container ----------------------
  let uiContainer = q("shaka-ui");
  if(!uiContainer){
    uiContainer = el("div");
    uiContainer.id = "shaka-ui";
    uiContainer.style.width = "100%";
    uiContainer.style.height = "100%";
    uiContainer.style.position = "absolute";
    uiContainer.style.top = "0";
    uiContainer.style.left = "0";
    videoContainer.style.position = "relative";
    videoContainer.appendChild(uiContainer);
  }

  // ---------------------- Create or Reuse Player ----------------------
  if(!window.APP.shakaPlayer){
    if(!window.shaka){ console.warn("Shaka not found"); return; }
    const player = new shaka.Player();
    window.APP.shakaPlayer = player;
    player.configure({
      streaming: { bufferingGoal: 5, rebufferingGoal: 2 },
      abr: { defaultBandwidthEstimate: 5000000, switchInterval: 4 }
    });
    player.addEventListener("error", e => console.warn("[SHAKA ERROR]", e?.detail?.message || e));

    try{ player.attach(video); } catch(e){ console.warn("Attach failed", e); }

    // Create overlay
    try{
      const overlay = new shaka.ui.Overlay(player, uiContainer, video);
      overlay.configure({
        controlPanelElements: [
          'rewind','fast_forward','play_pause','time_and_duration','mute','volume',
          'spacer','quality','captions','language','playback_rate','picture_in_picture',
          'airplay','cast','fullscreen','overflow_menu'
        ],
        addBigPlayButton: true,
        enableKeyboardPlaybackControls: true
      });
      window.APP.shakaUI = overlay;
    } catch(e){ console.warn("Shaka UI overlay failed", e); }
  } else {
    // Player exists, unload old stream
    try{ await window.APP.shakaPlayer.unload(); } catch(e){ console.warn("Unload failed", e); }
    // Re-attach overlay to player
    if(window.APP.shakaUI) window.APP.shakaUI.setPlayer(window.APP.shakaPlayer);
  }

  // ---------------------- Configure Clearkey ----------------------
  if(stream.clearkey){
    try{
      const keys = {};
      for(const k in stream.clearkey) keys[k] = stream.clearkey[k];
      window.APP.shakaPlayer.configure({ drm: { clearKeys: keys } });
      console.log("[DRM] Clearkey configured", keys);
    } catch(e){ console.warn("Clearkey config failed", e); }
  }

  // ---------------------- Load Stream ----------------------
  try{
    await window.APP.shakaPlayer.load(stream.url);
    video.muted = true;
    try{ await video.play(); } catch(e){ console.warn("Autoplay blocked", e); }
    console.log("[PLAY] Stream loaded:", stream.name || stream.url);
  } catch(e){
    console.warn("[PLAY] load error:", e);
  }
}
// ---------------------- Tabs ----------------------
function initTabs(){
  const tabs=document.querySelectorAll(".tab-btn");
  tabs.forEach(tab=>{
    tab.addEventListener("click",()=>{
      const filter=tab.getAttribute("data-filter");
      if(!filter) return;
      window.APP.currentTab=filter;
      tabs.forEach(t=>t.classList.remove("active"));
      tab.classList.add("active");
      renderMatches();
    });
  });
  const currentTab=window.APP.currentTab||"all";
  tabs.forEach(tab=>{
    if(tab.getAttribute("data-filter")===currentTab) tab.classList.add("active");
    else tab.classList.remove("active");
  });
}

// ---------------------- Caching ----------------------
function saveCache(){ try{ localStorage.setItem("matchesCache", JSON.stringify(window.APP.matches)); }catch(e){console.warn("Cache save failed",e);} }
function loadCache(){ try{ const c=localStorage.getItem("matchesCache"); if(c){ window.APP.matches=JSON.parse(c); renderMatches(); }}catch(e){console.warn("Cache load failed",e);} }

// ---------------------- Firebase ----------------------
function subscribeMatches(){
  if(!window.firebase||!firebase.database){ showOfflineMessage(); return; }
  firebase.database().ref("matches").on("value", snapshot=>{
    const data=snapshot.val();
    if(!data){ showOfflineMessage(); return; }
    window.APP.matches={cricket:[],football:[]};
    if(data.cricket) window.APP.matches.cricket=Object.values(data.cricket);
    if(data.football) window.APP.matches.football=Object.values(data.football);
    renderMatches(); saveCache();
  }, error=>{ console.error("Firebase error:", error); showOfflineMessage(); });
}

function showOfflineMessage(){
  const container=q("matches-section");
  if(!container) return;
  container.innerHTML=`<div class="no-matches"><h3>Offline</h3><p>Unable to load matches.</p></div>`;
}

// ---------------------- Init ----------------------
window.addEventListener("DOMContentLoaded",()=>{
  window.APP=window.APP||{};
  window.APP.countdowns={};
  window.APP.currentTab="all";
  window.APP.matches={cricket:[],football:[]};
  window.APP.lastMatch=null;
  window.APP.shakaPlayer=null;
  window.APP.shakaUI=null;

  initTabs(); loadCache(); subscribeMatches();
});
