(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const saveKey = 'novaEraSave_v1';
  const initial = {
    version: '0.4.0', crystals: 1200, coins: 8500, energy: 87, level: 1,
    summons: 0, wins: 0, dailyClaimed: false, voidCleared: false,
    heroes: [
      {id:'rei',name:'Рэй Кадзэ',rarity:'SR',level:1,bp:520,emoji:'🥷',element:'🌪️',glow:'#4b5d82',desc:'Быстрый шиноби ветра. Баланс атаки и скорости.',owned:true},
      {id:'akari',name:'Акарі',rarity:'R',level:1,bp:390,emoji:'🗡️',element:'🔥',glow:'#87364c',desc:'Боец ближнего боя, верна своему отряду.',owned:true},
      {id:'kuro',name:'Куро',rarity:'R',level:1,bp:330,emoji:'🌑',element:'🌘',glow:'#4d346d',desc:'Тактик теней. Умеет находить слабые места.',owned:true}
    ]
  };
  let state;
  try { state = {...initial, ...JSON.parse(localStorage.getItem(saveKey) || '{}')}; } catch { state = {...initial}; }
  if (!Array.isArray(state.heroes)) state.heroes = initial.heroes;
  let activeFilter = 'all';
  let activeElementFilter = 'all';
  let activeSort = 'bp';
  let toastTimer;
  // NOVA ERA — ENERGY REGENERATION
const ENERGY_MAX = 120;
const ENERGY_INTERVAL = 6 * 60 * 1000;

if (!Number.isFinite(state.energyUpdatedAt)) {
  state.energyUpdatedAt = Date.now();
}

function regenerateEnergy() {
  const now = Date.now();
  const elapsed = now - state.energyUpdatedAt;
  const gained = Math.floor(elapsed / ENERGY_INTERVAL);

  if (gained > 0) {
    state.energy = Math.min(ENERGY_MAX, state.energy + gained);
    state.energyUpdatedAt += gained * ENERGY_INTERVAL;

    if (state.energy >= ENERGY_MAX) {
      state.energyUpdatedAt = now;
    }

    localStorage.setItem(saveKey, JSON.stringify(state));
  }
}

setInterval(() => {
  regenerateEnergy();
  updateUI();
}, 10000);
  function persist(){ try { localStorage.setItem(saveKey, JSON.stringify(state)); } catch {} updateUI(); }
  function fmt(n){ return Math.floor(n).toLocaleString('ru-RU'); }
  function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),2300); }
  function go(name){
    const id = name === 'home' ? 'homeScreen' : name+'Screen';
    if (!$('#'+id)) name='home';
    $$('.screen').forEach(s=>s.classList.toggle('active',s.id===(name==='home'?'homeScreen':name+'Screen')));
    $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.go===name));
    if(name==='heroes') renderHeroes();
    if(name==='battle') renderTeam();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function bp(){return state.heroes.reduce((n,h)=>n+h.bp,0);}
  // Keep the price and preview identical to the values used by upgrade().
  function upgradeCost(h){return 250 + h.level * 100;}
  function upgradedBP(h){return h.bp + Math.max(40, Math.round(h.bp * 0.08));}
  function rarityColor(r){return r==='UR'?'#ff5e87':r==='SSR'?'#ffcf70':r==='SR'?'#cf9cff':'#9fb5d7';}
  function rarityStars(h){const count=({R:1,'R+':2,S:3,SR:4,SSR:4,UR:5})[h.rarity]||1;return '★'.repeat(count)+'<span class="star-dim">'+('★'.repeat(Math.max(0,5-count)))+'</span>'; }
  function heroCard(h, team=false){
    const rarityClass=(h.rarity||'R').toLowerCase().replace('+','plus');
    const nextBP=upgradedBP(h);
    return `<div class="${team?'team-card':'hero-card'} rarity-${rarityClass}" style="--glow:${h.glow||'#56304c'};--rarity-color:${rarityColor(h.rarity)}"><div class="portrait"><div class="portrait-halo"></div><div class="portrait-sigil">封</div><span class="rarity">${h.rarity}</span><span class="element">${h.element||'✦'}</span><span class="emoji">${h.emoji}</span><span class="portrait-label">NOVA ERA / SHINOBI</span></div><div class="hero-card-body"><div class="hero-name-row"><b>${h.name}</b><span class="hero-level">УР. ${h.level}</span></div><div class="hero-stars" aria-label="${h.rarity} rank">${rarityStars(h)}</div><div class="hero-power"><span>БОЕВАЯ СИЛА</span><b>${fmt(h.bp)} <small>BP</small></b></div><div class="hero-progress"><i style="width:${Math.min(100,Math.max(2,h.level/250*100))}%"></i></div><div class="hero-stat-row"><span>АТК <b>${fmt(Math.round(h.bp*.31))}</b></span><span>ЗАЩ <b>${fmt(Math.round(h.bp*.14))}</b></span><span>HP <b>${fmt(Math.round(h.bp*.55))}</b></span></div></div>${team?'':`<div class="hero-actions"><button class="upgrade-button" data-upgrade="${h.id}" ${h.level>=250?'disabled':''}>${h.level>=250?'МАКС. УРОВЕНЬ':'УСИЛИТЬ <small>+'+fmt(Math.max(40,Math.round(h.bp*.08)))+' BP</small><em>'+fmt(upgradeCost(h))+' ◉</em>'}</button><button class="details-button" data-details="${h.id}">ПРОФИЛЬ ↗</button></div>`}</div>`;
  }
  function renderTeam(){ $('#battleTeam').innerHTML=state.heroes.slice(0,3).map(h=>heroCard(h,true)).join(''); $('#battleBP').textContent=fmt(bp())+' BP'; }
  function renderHeroes(){
    let list=state.heroes.filter(h=>(activeFilter==='all'||h.rarity===activeFilter)&&(activeElementFilter==='all'||h.element===activeElementFilter));
    const rarityOrder={UR:5,SSR:4,SR:3,S:2,'R+':1,R:0};
    list.sort((a,b)=>activeSort==='level'?b.level-a.level:activeSort==='rarity'?(rarityOrder[b.rarity]||0)-(rarityOrder[a.rarity]||0):b.bp-a.bp);
    $('#heroCount').textContent=state.heroes.length+' гер.';
    $('#ownedHeroCount').textContent=state.heroes.length;
    $('#heroGrid').innerHTML=list.length?list.map(h=>heroCard(h)).join(''):'<div class="empty-state">Героев с такими параметрами пока нет.<br>Измени фильтр или попробуй призыв.</div>';
  }
  function updateUI(){
        regenerateEnergy();
    $('#crystals').textContent=fmt(state.crystals);$('#coins').textContent=fmt(state.coins);
    $('#energy').textContent=state.energy+'/120';$('#playerLevel').textContent=state.level;
    $('#summonCount').textContent=state.summons%10;$('#pityFill').style.width=((state.summons%10)*10)+'%';
    $('#dailyText').textContent=state.dailyClaimed?'Приказ выполнен. Возвращайся завтра.':'Пройди 1 бой и получи награду.';
    $('#claimDaily').textContent=state.dailyClaimed?'ВЫПОЛНЕНО':'ЗАБРАТЬ';
    $('#claimDaily').disabled=state.dailyClaimed;$('#claimDaily').style.opacity=state.dailyClaimed?'.5':'1';
    $('#voidStatus').textContent=state.voidCleared?'ОТКРЫТ':'ЗАКРЫТ';$('#sectorNum').textContent=state.voidCleared?'02 / 10':'01 / 10';
    renderTeam(); if($('#heroesScreen').classList.contains('active'))renderHeroes();
  }
  function modal(title,body,button='ПОНЯТНО',action=null){
    $('#modalContent').innerHTML=`<h2>${title}</h2>${body}<button id="modalAction" class="primary">${button}</button>`;
    $('#modal').classList.remove('hidden');
    $('#modalAction').onclick=()=>{ $('#modal').classList.add('hidden'); if(action)action(); };
  }
  const pool = [
    {name:'Сора',rarity:'R',emoji:'🌀',element:'💧',glow:'#315a77',bp:360,desc:'Потоковый боец, мастер контроля.'},
    {name:'Рэн',rarity:'R',emoji:'🥷',element:'🌑',glow:'#49395f',bp:380,desc:'Тихий разведчик теней.'},
    {name:'Мика',rarity:'R',emoji:'🦊',element:'🔥',glow:'#85434d',bp:400,desc:'Быстрая атака и огненный характер.'},
    {name:'Тэн',rarity:'SR',emoji:'⚡',element:'⚡',glow:'#7c5d39',bp:560,desc:'Громовой шиноби с высокой скоростью.'},
    {name:'Юна',rarity:'SR',emoji:'🌙',element:'🌙',glow:'#57417b',bp:590,desc:'Мастер иллюзий и поддержки.'},
    {name:'Рэй Кадзэ',rarity:'SR',emoji:'🥷',element:'🌪️',glow:'#4b5d82',bp:620,desc:'Быстрый шиноби ветра.'},
    {name:'Акира Нокт',rarity:'SSR',emoji:'👹',element:'🔥',glow:'#a92f54',bp:950,desc:'Легендарный воин, чья сила пробуждается в разломе.'},
    {name:'Сэйра',rarity:'SSR',emoji:'🦋',element:'🌌',glow:'#6438a0',bp:920,desc:'Хранительница звёздной печати.'}
  ];
  function roll(forceSSR=false){
    const r=Math.random();
    let choices;
    if(forceSSR) choices=pool.filter(h=>h.rarity==='SSR');
    else if(r<.10) choices=pool.filter(h=>h.rarity==='SSR');
    else if(r<.45) choices=pool.filter(h=>h.rarity==='SR');
    else choices=pool.filter(h=>h.rarity==='R');
    const p=choices[Math.floor(Math.random()*choices.length)];
    return {...p,id:p.name.toLowerCase().replace(/[^a-zа-я0-9]/gi,'')+'_'+Date.now()+'_'+Math.random().toString(16).slice(2,6),level:1,owned:true};
  }
  function summon(count){
    const cost=count===10?900:100;
    if(state.crystals<cost){toast('Недостаточно кристаллов. Пройди бой и забери награды.');return;}
    state.crystals-=cost;
    const results=[];
    for(let i=0;i<count;i++){
      state.summons++;
      const guaranteed=(state.summons%10===0);
      const h=roll(guaranteed);
      state.heroes.push(h);results.push(h);
    }
    persist();
    $('#summonResults').innerHTML=results.map(h=>`<div class="summon-result" style="border-color:${rarityColor(h.rarity)}"><div class="emoji">${h.emoji}</div><b>${h.name}</b><small>${h.rarity}</small></div>`).join('');
    const ssr=results.filter(h=>h.rarity==='SSR').length;
    toast(ssr?'Пробуждение! Получен SSR!':`Призыв завершён: ${count} ${count===1?'герой':'героев'}.`);
    if(ssr) setTimeout(()=>modal('ПРОБУЖДЕНИЕ SSR',`<div class="modal-hero"><div class="emoji">${results.find(h=>h.rarity==='SSR').emoji}</div><div class="rarity-label">SSR · ЛЕГЕНДАРНЫЙ ГЕРОЙ</div><h2>${results.find(h=>h.rarity==='SSR').name}</h2><p>${results.find(h=>h.rarity==='SSR').desc}</p></div>`,'В КОЛЛЕКЦИЮ',()=>go('heroes')),450);
  }
  function battle(){
if(state.energy<10){toast('Недостаточно энергии. Для боя нужно 10.');return;}
if(state.energy>=ENERGY_MAX) state.energyUpdatedAt=Date.now();
state.energy-=10;
    const power=bp(), win=power>=1200||Math.random()<(power/1600);
    const result=$('#battleResult');result.classList.remove('hidden');
    if(win){
      state.wins++;state.coins+=650;state.crystals+=100;state.level=Math.min(500,1+Math.floor(state.wins/3));
      result.innerHTML=`<h3>ПОБЕДА</h3><p>Твой отряд прорвал оборону у ворот. Сила — это не только BP, но и командная тактика.</p><p class="result-reward">Награда: +650 монет · +100 кристаллов · +1 опыт победы</p>`;
      toast('Победа! Награды добавлены на счёт.');
    }else{
      result.innerHTML=`<h3>ОТРЯД ОТСТУПИЛ</h3><p>Противник оказался сильнее. Усиль героев или попробуй снова — поражение не отнимает монеты.</p>`;
      toast('Попробуй улучшить героев перед следующим боем.');
    }
    persist();
  }
  function upgrade(id){
    const h=state.heroes.find(x=>x.id===id);if(!h)return;
    if(h.level>=250){toast('Максимальный уровень героя — 250.');return;}
    const cost=upgradeCost(h);
    if(state.coins<cost){toast('Недостаточно монет для улучшения.');return;}
    state.coins-=cost;h.level=Math.min(250,h.level+1);h.bp=upgradedBP({...h, level:h.level-1});
    persist();toast(`${h.name} усилен до уровня ${h.level}.`);
  }
  document.addEventListener('click',e=>{
    const nav=e.target.closest('[data-go]');if(nav){go(nav.dataset.go);return;}
    const action=e.target.closest('[data-action]');if(action){
      if(action.dataset.action==='crystalInfo')modal('Кристаллы',`<p>Кристаллы используются для призыва героев. Их можно заработать в кампании и испытаниях.</p><p>Баланс: <b>${fmt(state.crystals)} ◆</b></p>`);
      else modal('Монеты',`<p>Монеты нужны для усиления героев. Получай их за победы в кампании.</p><p>Баланс: <b>${fmt(state.coins)} ◉</b></p>`);
      return;
    }
    const up=e.target.closest('[data-upgrade]');if(up){upgrade(up.dataset.upgrade);return;}
    const details=e.target.closest('[data-details]');if(details){const h=state.heroes.find(x=>x.id===details.dataset.details);if(h)modal(h.name,`<div class="modal-hero profile-detail"><div class="profile-art" style="--glow:${h.glow||'#56304c'};--rarity-color:${rarityColor(h.rarity)}"><span class="profile-rarity">${h.rarity}</span><span class="profile-element">${h.element||'✦'}</span><span class="emoji">${h.emoji}</span><span class="profile-stars">${rarityStars(h)}</span></div><div class="rarity-label">${h.rarity} · ${h.element||'Стихия не указана'}</div><p>${h.desc||'Шиноби отряда Nova Era.'}</p><div class="profile-stat-grid"><div><small>БОЕВАЯ СИЛА</small><b>${fmt(h.bp)} BP</b></div><div><small>УРОВЕНЬ</small><b>${h.level}/250</b></div><div><small>АТАКА</small><b>${fmt(Math.round(h.bp*.31))}</b></div><div><small>ЗАЩИТА</small><b>${fmt(Math.round(h.bp*.14))}</b></div><div><small>ЗДОРОВЬЕ</small><b>${fmt(Math.round(h.bp*.55))}</b></div><div><small>СЛЕД. УЛУЧШЕНИЕ</small><b>${h.level>=250?'МАКС.':fmt(upgradeCost(h))+' ◉'}</b></div></div><div class="profile-skill-title">НАВЫКИ ШИНОБИ</div><div class="profile-skills"><div><span>⚔️</span><b>Быстрый удар</b><small>Урон от АТК</small></div><div><span>${h.element||'✦'}</span><b>Стихийная техника</b><small>Особый эффект стихии</small></div><div><span>✧</span><b>Пробуждение</b><small>Открывается при развитии</small></div></div><p class="profile-note">Навыки пока представлены как интерфейсный прототип; их боевые эффекты будут добавлены отдельным обновлением.</p></div>`);return;}
    const filter=e.target.closest('[data-filter]');if(filter){activeFilter=filter.dataset.filter;$$('.filter').forEach(b=>b.classList.toggle('active',b===filter));renderHeroes();return;}
    const element=e.target.closest('[data-element]');if(element){activeElementFilter=element.dataset.element;$$('.element-chip').forEach(b=>b.classList.toggle('active',b===element));renderHeroes();return;}
  });
  $('#heroSort').addEventListener('change',e=>{activeSort=e.target.value;renderHeroes();});
  $('#startBattle').addEventListener('click',battle);
  $('#summonOne').addEventListener('click',()=>summon(1));
  $('#summonTen').addEventListener('click',()=>summon(10));
  $('#claimDaily').addEventListener('click',()=>{
    if(state.dailyClaimed)return;
    if(state.wins<1){toast('Сначала заверши хотя бы один бой.');return;}
    state.dailyClaimed=true;state.crystals+=150;state.coins+=500;persist();toast('Ежедневный приказ выполнен: +150 кристаллов!');
  });
  $('#voidChallenge').addEventListener('click',()=>{
    if(state.voidCleared){modal('Печать стабилизирована','<p>Сектор 01 пройден. Следующие сектора появятся в будущих обновлениях прототипа.</p>');return;}
    if(state.wins<1){modal('Разлом закрыт','<p>Сначала пройди первую миссию кампании. Нужна энергия и подготовленный отряд.</p>','К КАМПАНИИ',()=>go('battle'));return;}
    state.voidCleared=true;state.crystals+=150;state.coins+=300;persist();
    modal('ПЕЧАТЬ ОСЛАБЛЕНА','<p>Ты стабилизировал первый сектор разлома.</p><p><b>Награда: +150 кристаллов · +300 монет</b></p>','ПРИНЯТЬ');
  });
  $('#closeModal').addEventListener('click',()=>$('#modal').classList.add('hidden'));
  $('#modal').addEventListener('click',e=>{if(e.target.id==='modal')$('#modal').classList.add('hidden');});
  window.addEventListener('keydown',e=>{if(e.key==='Escape')$('#modal').classList.add('hidden');});
  updateUI();
})();
