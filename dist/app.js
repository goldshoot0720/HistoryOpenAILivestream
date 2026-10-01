const events=window.ARCHIVE_EVENTS;const $=s=>document.querySelector(s);let selected=events.find(e=>e.id==='work-2026')||events[0],year='all',visibleCount=24,language='both',demoTimer=null,demoIndex=0,player=null,tracks={zh:[],en:[]},lastKey='',apiReady=false,playerReady=false,pendingSeek=null,pendingPlay=false,scrubbing=false,trackRequest=0,bundledTracks={zh:[],en:[]};const sample=[{zh:'每一次突破，都從一個問題開始。',en:'Every breakthrough begins with a question.'},{zh:'回看那些，讓未來更靠近的時刻。',en:'Revisit the moments that brought the future closer.'},{zh:'兩種語言，同一份好奇心。',en:'Two languages. One shared curiosity.'}];
function dateLabel(d){const [y,m,day]=d.split('-');return `${y} 年 ${+m} 月 ${+day} 日`;}function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}function thumbnail(e){return e.image||`https://i.ytimg.com/vi/${e.video}/hqdefault.jpg`;}
function kindLabel(e) {
  return '直播';
}
function durationLabel(seconds) {
  if (!seconds) return '';
  const h=Math.floor(seconds/3600), m=Math.floor(seconds%3600/60), sec=seconds%60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
}
function render() {
  const q=$('#search').value.trim().toLowerCase();
  const found=events.filter(e=>(year==='all'||e.date.startsWith(year)) &&
    `${e.title} ${e.en} ${e.video||''}`.toLowerCase().includes(q));
  const shown=found.slice(0,visibleCount);
  $('#grid').innerHTML=shown.map(e=>`
    <button class="card" data-id="${e.id}" aria-label="${esc(e.title)}，${dateLabel(e.date)}，觀看影片">
      <span class="card-image">
        ${e.video||e.image?`<img loading="lazy" src="${esc(thumbnail(e))}" alt="${esc(e.title)}影片封面">`:`<span class="source-poster">${esc(e.en)}</span>`}
        <span class="card-kind">${kindLabel(e)}</span>
        ${e.duration?`<span class="card-duration">${durationLabel(e.duration)}</span>`:''}
        <span class="card-play">▶</span>
      </span>
      <span class="card-date">${dateLabel(e.date)}</span>
      <span class="card-title">${esc(e.title)}</span>
      ${e.en&&e.en!==e.title?`<span class="card-en">${esc(e.en)}</span>`:''}
      <span class="card-meta"><span class="replay">${e.video?'觀看影片':'官方重播頁面'}</span><span>${hasSaved(e.id)?'已匯入字幕':window.ARCHIVE_SUBTITLES?.[e.video]?.zh?'內建中文字幕':window.ARCHIVE_SUBTITLES?.[e.video]?.en?'內建英文 · 中文用 YouTube 翻譯':'YouTube 字幕'}</span></span>
    </button>`).join('');
  $('#empty').hidden=found.length!==0;
  $('#record-count').textContent=`${found.length} 場已整理`;
  $('#shown-count').textContent=found.length?`已顯示 ${shown.length} / ${found.length} 場`:'';
  $('#load-more').hidden=shown.length>=found.length;
  document.querySelectorAll('.card').forEach(b=>b.onclick=()=>selectEvent(b.dataset.id));
  document.querySelectorAll('.card-image img').forEach(img=>img.onerror=()=>{
    const placeholder=document.createElement('span');
    placeholder.className='source-poster';
    placeholder.textContent=img.alt.replace('影片封面','');
    img.replaceWith(placeholder);
  });
}
function resetResults() { visibleCount=24; render(); }

function hasSaved(id){try{return !!localStorage.getItem('live-subs-'+id);}catch{return false;}}
function savedTracks(){try{return JSON.parse(localStorage.getItem('live-subs-'+selected.id))||{};}catch{return {};}}
function validCues(value){return Array.isArray(value)?value.filter(c=>Number.isFinite(c.start)&&Number.isFinite(c.end)&&c.start>=0&&c.end>c.start&&typeof c.text==='string'):[];}
function mergeTracks(){const saved=savedTracks();tracks={zh:validCues(saved.zh).length?validCues(saved.zh):bundledTracks.zh,en:validCues(saved.en).length?validCues(saved.en):bundledTracks.en};lastKey='';updateStatus();}
async function readTracks(){
  const request=++trackRequest,eventId=selected.id,videoId=selected.video;
  bundledTracks={zh:[],en:[]};$('#offset').value=0;mergeTracks();
  if(!window.ARCHIVE_SUBTITLES?.[videoId])return;
  $('#subtitle-status').textContent='正在載入影片字幕…';
  try{
    const response=await fetch(`subtitles/${encodeURIComponent(videoId)}.json`);
    if(!response.ok)throw Error('Subtitle fetch failed');
    const data=await response.json();
    if(request!==trackRequest||selected.id!==eventId)return;
    bundledTracks={zh:validCues(data.zh),en:validCues(data.en)};mergeTracks();syncCaptions();
  }catch{
    if(request===trackRequest)updateStatus('內建字幕未能載入，請重新整理或匯入 SRT／VTT。YouTube 字幕仍可從播放器 CC 開啟。');
  }
}
function updateStatus(msg){
  const zh=tracks.zh.length,en=tracks.en.length;
  $('#subtitle-status').textContent=msg||(zh?`已載入 ${zh} 段中文、${en} 段英文字幕，會隨影片時間同步。`:en?`已載入 ${en} 段英文字幕。中文字幕請在 YouTube 設定 → 字幕 → 自動翻譯，選「中文（繁體）」。`:'請從 YouTube 播放器 CC 開啟字幕；需要中文時，在設定 → 字幕 → 自動翻譯選「中文（繁體）」。亦可匯入 SRT／VTT。');
  $('#native-caption-help').hidden=!!zh;
  $('#native-caption-help').textContent=language==='off'?'特效字幕已關閉。YouTube 原生字幕請使用播放器 CC 按鈕關閉。':'中文字幕：播放影片後，開啟齒輪設定 → 字幕 → 自動翻譯 → 中文（繁體）。上方按鈕控制本站特效字幕；YouTube 原生字幕由播放器 CC 管理。';
}
function selectEvent(id){const e=events.find(e=>e.id===id);if(!e)throw Error('找不到這支影片');stopDemo();if(player){player.destroy();player=null;}if(!$('#yt-player')){const mount=document.createElement('div');mount.id='yt-player';$('#video-stage').append(mount);}selected=e;playerReady=false;pendingSeek=null;pendingPlay=false;scrubbing=false;resetPlayback();$('#poster').src=(e.video||e.image)?thumbnail(e):'';$('#poster').alt=e.title+'影片封面';$('#poster').hidden=!(e.video||e.image);$('#play').hidden=false;$('#play').setAttribute('aria-label',e.video?'播放精選影片':'開啟官方重播頁面');$('.poster-shade').hidden=false;$('.poster-label').hidden=false;$('#video-title').textContent=e.title;$('#video-english').textContent=e.en||kindLabel(e);$('#video-english').hidden=e.en===e.title;$('#video-description').textContent=e.description||'回看這場 OpenAI 官方直播，並依需要匯入中英文字幕。';$('#video-date').textContent=dateLabel(e.date);$('#video-year').textContent=e.date.slice(0,4);$('#source-link').href=e.video?'https://www.youtube.com/watch?v='+e.video:e.source;$('#source-link').textContent=e.video?'在 YouTube 觀看 ↗':'官方重播頁面 ↗';$('#yt-player').replaceChildren();readTracks();lastKey='';$('#watch').scrollIntoView({behavior:'smooth',block:'start'});return {id:e.id,title:e.title};}
function setLanguage(value){if(!['both','zh','en','off'].includes(value))throw Error('不支援的字幕語言');language=value;updateStatus();document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===value)));lastKey='';if(demoTimer)showCaption(sample[demoIndex],true);else syncCaptions();return {language};}
function showCaption(cue,isDemo){if(!cue||language==='off'){$('#captions').hidden=true;return;}$('#captions').hidden=false;$('#demo-label').hidden=!isDemo;const effect=$('#effect').value;for(const key of ['zh','en']){const el=$('#caption-'+key);el.className=`caption-${key} effect-${effect}`;const text=(language==='both'||language===key)?cue[key]||'':'';el.replaceChildren();if(effect==='reveal'){const parts=key==='zh'?Array.from(text):text.split(/(\s+)/);parts.forEach((word,i)=>{const s=document.createElement('span');s.textContent=word;s.style.setProperty('--delay',Math.min(i*.04,1.1)+'s');el.append(s);});}else el.textContent=text;}}
function stopDemo(){if(demoTimer)clearInterval(demoTimer);demoTimer=null;$('#demo').innerHTML='<span class="spark">✧</span> 預覽字幕特效';$('#captions').hidden=true;lastKey='';}$('#demo').onclick=()=>{if(demoTimer){stopDemo();return;}if(player?.pauseVideo)player.pauseVideo();demoIndex=0;showCaption(sample[0],true);$('#demo').textContent='停止特效預覽';demoTimer=setInterval(()=>{demoIndex=(demoIndex+1)%sample.length;showCaption(sample[demoIndex],true);},4200);};document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>setLanguage(b.dataset.lang));$('#effect').onchange=()=>{lastKey='';if(demoTimer)showCaption(sample[demoIndex],true);else syncCaptions();};$('#search').oninput=resetResults;
function playbackMessage(message){$('#playback-status').textContent=message;}
function resetPlayback(){
  $('#timeline').max=selected.duration||0;$('#timeline').value=0;$('#timeline').disabled=!selected.duration;
  $('#time-current').textContent='0:00';$('#time-total').textContent=durationLabel(selected.duration)||'--:--';
  $('#time-input').value='';$('#toggle-play').textContent='播放';playbackMessage('可拖曳進度條，或輸入分:秒／時:分:秒跳轉。');
}
function parseTime(value){
  const text=value.trim();
  if(!/^\d+(?::[0-5]\d){0,2}(?:\.\d+)?$/.test(text))return NaN;
  return text.split(':').reduce((time,part)=>time*60+Number(part),0);
}
function sourceAt(seconds){$('#source-link').href=`https://www.youtube.com/watch?v=${selected.video}&t=${Math.max(0,Math.floor(seconds))}s`;}
function updatePlayback(){
  if(!playerReady||!player?.getCurrentTime)return;
  const duration=player.getDuration()||selected.duration||0,current=player.getCurrentTime()||0;
  $('#timeline').max=duration;$('#timeline').disabled=!duration;
  if(!scrubbing){$('#timeline').value=current;$('#time-current').textContent=durationLabel(Math.floor(current))||'0:00';}
  $('#time-total').textContent=durationLabel(Math.floor(duration))||'--:--';
  $('#timeline').setAttribute('aria-valuetext',`${$('#time-current').textContent} / ${$('#time-total').textContent}`);
  $('#toggle-play').textContent=player.getPlayerState()===1?'暫停':'播放';sourceAt(current);
}
function ensurePlayer(){
  if(player)return;
  if(!apiReady||!window.YT?.Player){playbackMessage('正在連接 YouTube，載入後會跳至指定時間。若無法連線，可用 YouTube 連結觀看。');return;}
  $('#play').hidden=true;$('.poster-label').hidden=true;
  player=new YT.Player('yt-player',{
    videoId:selected.video,host:'https://www.youtube-nocookie.com',
    playerVars:{autoplay:0,controls:1,disablekb:0,rel:0,playsinline:1,origin:location.origin,hl:'zh-TW',cc_lang_pref:language==='en'?'en':'zh-Hant',cc_load_policy:language==='off'||tracks.zh.length?0:1},
    events:{
      onReady:event=>{
        playerReady=true;
        event.target.getIframe().setAttribute('referrerpolicy','strict-origin-when-cross-origin');
        if(pendingSeek!==null){event.target.seekTo(pendingSeek,true);pendingSeek=null;}
        if(pendingPlay){event.target.playVideo();pendingPlay=false;}
        playbackMessage('可拖曳進度條或輸入時間跳轉。YouTube 原生控制列也可直接操作。');updatePlayback();
      },
      onStateChange:event=>{if(event.data===1&&demoTimer)stopDemo();lastKey='';updatePlayback();syncCaptions();},
      onError:()=>{playerReady=false;playbackMessage('影片暫時無法在站內播放，請用 YouTube 連結；連結會保留跳轉時間。');},
      onAutoplayBlocked:()=>playbackMessage('瀏覽器已暫停自動播放，請按播放器的播放鍵。')
    }
  });
}
function seekTo(seconds){
  if(!Number.isFinite(seconds)||seconds<0){playbackMessage('請輸入有效時間，例如 2:30 或 1:02:30。');return false;}
  stopDemo();
  const duration=playerReady?player.getDuration()||selected.duration:selected.duration;
  const target=duration?Math.min(seconds,duration):seconds;
  $('#timeline').value=target;$('#time-current').textContent=durationLabel(Math.floor(target))||'0:00';sourceAt(target);lastKey='';
  if(playerReady){player.seekTo(target,true);syncCaptions();playbackMessage(`已跳至 ${durationLabel(Math.floor(target))||'0:00'}。`);}
  else{pendingSeek=target;pendingPlay=true;ensurePlayer();}
  return true;
}
$('#play').onclick=()=>{stopDemo();pendingPlay=true;ensurePlayer();};
$('#toggle-play').onclick=()=>{stopDemo();if(playerReady){player.getPlayerState()===1?player.pauseVideo():player.playVideo();}else{pendingPlay=true;ensurePlayer();}};
$('#seek-form').onsubmit=event=>{event.preventDefault();seekTo(parseTime($('#time-input').value));};
$('#timeline').oninput=()=>{scrubbing=true;$('#time-current').textContent=durationLabel(Math.floor(Number($('#timeline').value)))||'0:00';};
$('#timeline').onchange=()=>{scrubbing=false;seekTo(Number($('#timeline').value));};
for(const seconds of [-10,10])$('#skip-'+(seconds<0?'back':'forward')).onclick=()=>seekTo(Math.max(0,(playerReady?player.getCurrentTime():pendingSeek||0)+seconds));
window.onYouTubeIframeAPIReady=()=>{apiReady=true;if(pendingPlay||pendingSeek!==null)ensurePlayer();};
const api=document.createElement('script');api.src='https://www.youtube.com/iframe_api';api.onerror=()=>playbackMessage('YouTube 連線未成功，請使用下方連結觀看；連結會保留跳轉時間。');document.head.append(api);
setInterval(updatePlayback,300);
function syncCaptions(){if(demoTimer)return;if(!playerReady||!player?.getCurrentTime){$('#captions').hidden=true;return;}const t=player.getCurrentTime()-Number($('#offset').value||0);const zh=tracks.zh.findLast(c=>t>=c.start&&t<c.end);const en=tracks.en.findLast(c=>t>=c.start&&t<c.end);const key=`${language}|${$('#effect').value}|${zh?.start}|${zh?.text}|${en?.start}|${en?.text}`;if(key===lastKey)return;lastKey=key;showCaption(zh||en?{zh:zh?.text||'',en:en?.text||''}:null,false);}setInterval(syncCaptions,150);
function parseSubtitles(text){const ts=s=>{const p=s.replace(',','.').split(':').map(Number);return p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+p[1];};const cues=[];const normalized=text.replace(/^\uFEFF/,'').replace(/\r/g,'');for(const block of normalized.split(/\n\s*\n/)){const lines=block.split('\n');const i=lines.findIndex(l=>l.includes('-->'));if(i<0)continue;const match=lines[i].match(/((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{3})\s*-->\s*((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{3})/);if(!match)continue;const start=ts(match[1]),end=ts(match[2]);const body=lines.slice(i+1).join('\n').replace(/<[^>]*>/g,'').trim();if(Number.isFinite(start)&&end>start&&body)cues.push({start,end,text:body});}return cues.sort((a,b)=>a.start-b.start);}
for(const lang of ['zh','en'])$('#'+lang+'-file').onchange=async ev=>{const file=ev.target.files[0];if(!file)return;const eventId=selected.id;if(file.size>5*1024*1024){updateStatus('請選擇小於 5 MB 的字幕檔。');return;}const cues=parseSubtitles(await file.text());if(selected.id!==eventId)return;if(!cues.length){updateStatus('找不到有效的時間碼，請檢查 SRT／VTT 格式。');return;}stopDemo();tracks[lang]=cues;const saved=savedTracks();saved[lang]=cues;try{localStorage.setItem('live-subs-'+selected.id,JSON.stringify(saved));updateStatus();}catch{updateStatus('字幕已載入；瀏覽器儲存空間不足，重新開啟後需再次匯入。');}lastKey='';render();};$('#clear-subs').onclick=()=>{try{localStorage.removeItem('live-subs-'+selected.id);}catch{}$('#zh-file').value='';$('#en-file').value='';stopDemo();mergeTracks();render();};$('#offset').oninput=()=>{lastKey='';syncCaptions();};
const years=[...new Set(['2022','2023','2024','2025','2026',...events.map(e=>e.date.slice(0,4))])].sort().reverse();
$('#year-tabs').innerHTML='<button data-year="all" aria-pressed="true">全部年份</button>'+years.map(y=>`<button data-year="${y}" aria-pressed="false">${y}</button>`).join('');
document.querySelectorAll('[data-year]').forEach(button=>button.onclick=()=>{
  year=button.dataset.year;
  document.querySelectorAll('[data-year]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.year===year)));
  resetResults();
});
$('#load-more').onclick=()=>{visibleCount+=24;render();};
resetPlayback();readTracks();render();
if(document.modelContext?.registerTool){const lifecycle=new AbortController();const tools=[{name:'select_livestream',title:'選擇直播',description:'選擇已整理的官方直播並更新播放器與字幕控制，不會自動播放。',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||typeof input.id!=='string')throw Error('請提供影片 id');return selectEvent(input.id);}},{name:'configure_subtitle_language',title:'設定字幕語言',description:'設定播放器字幕為中英雙語、中文、英文或關閉。',inputSchema:{type:'object',properties:{language:{type:'string',enum:['both','zh','en','off']}},required:['language'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){return setLanguage(input?.language);}}];for(const tool of tools){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
