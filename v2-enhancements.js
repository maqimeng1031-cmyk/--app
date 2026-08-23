(() => {
  const oldRender = render;
  const oldLog = log;

  function txLog(type, text, undo = null) {
    state.logs = state.logs || [];
    state.logs.unshift({ id: state.nextId++, type, text, time: now(), undo, undone: false });
    save();
  }
  log = txLog;

  function adjustOwned(memberId, key, delta) {
    const m = state.members.find(x => x.id === memberId);
    if (!m || !m.owned || !m.owned[key]) return;
    m.owned[key].qty += delta;
    if (m.owned[key].qty <= 0) delete m.owned[key];
  }

  function makeBtn(text, cls, fn) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.className = 'btn ' + cls;
    b.style.minHeight = '34px';
    b.style.padding = '6px 9px';
    b.style.fontSize = '12px';
    b.addEventListener('click', fn);
    return b;
  }

  function editMember(id) {
    const m = state.members.find(x => x.id === id); if (!m) return;
    const name = prompt('修改姓名 / 昵称', m.name); if (name === null) return;
    const n = name.trim(); if (!n) return toast('姓名不能为空');
    const note = prompt('修改备注', m.note || ''); if (note === null) return;
    m.name = n; m.note = note.trim();
    txLog('编辑', '编辑会员：' + m.name); save(); render();
  }
  function deleteMember(id) {
    const m = state.members.find(x => x.id === id); if (!m) return;
    const hasData = Number(m.balance || 0) !== 0 || Object.keys(m.owned || {}).length > 0;
    if (!confirm((hasData ? '该会员还有余额或商品。\n' : '') + '确定删除「' + m.name + '」吗？')) return;
    state.members = state.members.filter(x => x.id !== id);
    txLog('删除', '删除会员：' + m.name); save(); render();
  }
  function editSet(id) {
    const s = state.sets.find(x => x.id === id); if (!s) return;
    const name = prompt('修改商品套名称', s.name); if (name === null) return;
    const n = name.trim(); if (!n) return toast('套名不能为空');
    const priceRaw = prompt('修改每抽售价', String(s.drawPrice || 0)); if (priceRaw === null) return;
    const price = Math.max(0, Number(priceRaw) || 0);
    const lastMode = confirm('这套有 Last赏吗？\n确定＝LASTあり；取消＝LASTなし');
    let lastName = '';
    if (lastMode) { const v = prompt('Last赏名称', s.lastPrize || ''); if (v === null) return; lastName = v.trim(); if (!lastName) return toast('请填写 Last赏名称'); }
    s.name = n; s.drawPrice = price; s.hasLast = lastMode; s.lastPrize = lastMode ? lastName : ''; if (!lastMode) s.lastAwarded = false;
    txLog('编辑', '编辑商品套：' + s.name); save(); render();
  }
  function deleteSet(id) {
    const s = state.sets.find(x => x.id === id); if (!s) return;
    if (!confirm('删除整套「' + s.name + '」会同时删除这套的所有赏品。确定吗？')) return;
    state.sets = state.sets.filter(x => x.id !== id);
    state.prizes = state.prizes.filter(p => p.setId !== id);
    txLog('删除', '删除商品套：' + s.name); save(); render();
  }
  function editPrize(id) {
    const p = state.prizes.find(x => x.id === id); if (!p) return;
    const rank = prompt('修改赏级', p.rank); if (rank === null) return;
    const name = prompt('修改奖品名称', p.name); if (name === null) return;
    const totalRaw = prompt('修改初始数量', String(p.total)); if (totalRaw === null) return;
    const remainRaw = prompt('修改剩余数量', String(p.remain)); if (remainRaw === null) return;
    const total = Math.floor(Number(totalRaw)), remain = Math.floor(Number(remainRaw));
    if (!rank.trim() || !name.trim() || total < 0 || remain < 0 || remain > total) return toast('数量不正确：剩余不能大于初始');
    p.rank = rank.trim(); p.name = name.trim(); p.total = total; p.remain = remain;
    txLog('编辑', '编辑赏品：' + p.rank + ' ' + p.name); save(); render();
  }
  function deletePrize(id) {
    const p = state.prizes.find(x => x.id === id); if (!p) return;
    if (!confirm('确定删除「' + p.rank + ' ' + p.name + '」吗？')) return;
    state.prizes = state.prizes.filter(x => x.id !== id);
    txLog('删除', '删除赏品：' + p.rank + ' ' + p.name); save(); render();
  }

  function enhanceMembers() {
    const rows = [...document.querySelectorAll('#memberList .row')];
    rows.forEach((row, i) => {
      const m = state.members[i]; if (!m || row.querySelector('.v2-actions')) return;
      const box = document.createElement('div'); box.className = 'btnrow v2-actions'; box.style.marginTop = '6px';
      box.append(makeBtn('编辑', 'secondary', () => editMember(m.id)), makeBtn('删除', 'danger', () => deleteMember(m.id)));
      const right = row.lastElementChild; if (right) right.appendChild(box);
    });
  }
  function enhanceSets() {
    const cards = [...document.querySelectorAll('#setList .setcard')];
    cards.forEach((card, si) => {
      const s = state.sets[si]; if (!s) return;
      const head = card.querySelector('.sethead');
      if (head && !head.querySelector('.v2-set-actions')) {
        const box = document.createElement('div'); box.className = 'btnrow v2-set-actions'; box.style.marginTop = '6px';
        box.append(makeBtn('编辑套', 'secondary', () => editSet(s.id)), makeBtn('删除套', 'danger', () => deleteSet(s.id)));
        head.appendChild(box);
      }
      const prizeEls = [...card.querySelectorAll('.prize')];
      const ps = state.prizes.filter(p => p.setId === s.id);
      prizeEls.forEach((el, pi) => {
        const p = ps[pi]; if (!p || el.querySelector('.v2-prize-actions')) return;
        const box = document.createElement('div'); box.className = 'btnrow v2-prize-actions'; box.style.marginTop = '6px';
        box.append(makeBtn('编辑', 'secondary', () => editPrize(p.id)), makeBtn('删除', 'danger', () => deletePrize(p.id)));
        el.appendChild(box);
      });
    });
  }

  const oldOwned = renderOwned;
  renderOwned = function() {
    oldOwned();
    const m = state.members.find(x => x.id === +document.querySelector('#ownedMember').value); if (!m) return;
    const rows = [...document.querySelectorAll('#ownedList .row')];
    const entries = Object.entries(m.owned || {});
    rows.forEach((row, i) => {
      const entry = entries[i]; if (!entry || row.querySelector('.v2-owned-actions')) return;
      const [key, o] = entry;
      const box = document.createElement('div'); box.className = 'btnrow v2-owned-actions'; box.style.marginTop = '4px';
      box.append(
        makeBtn('-1', 'secondary', () => { adjustOwned(m.id, key, -1); txLog('修正', m.name + ' 的 ' + o.name + ' -1'); render(); }),
        makeBtn('+1', 'secondary', () => { adjustOwned(m.id, key, 1); txLog('修正', m.name + ' 的 ' + o.name + ' +1'); render(); }),
        makeBtn('删除', 'danger', () => { if (confirm('删除这项客人物品记录吗？')) { delete m.owned[key]; txLog('修正', '删除 ' + m.name + ' 的 ' + o.name); render(); } })
      );
      row.appendChild(box);
    });
  };

  function undoLog(index) {
    const l = state.logs[index]; if (!l || !l.undo || l.undone) return;
    if (!confirm('确定撤销这笔记录吗？相关余额、库存和客人物品会一起恢复。')) return;
    const u = l.undo;
    if (u.kind === 'balance') {
      const m = state.members.find(x => x.id === u.memberId); if (!m) return toast('会员已不存在，无法撤销');
      m.balance -= u.delta;
    } else if (u.kind === 'sale') {
      const m = state.members.find(x => x.id === u.memberId), p = state.prizes.find(x => x.id === u.prizeId);
      if (!m || !p) return toast('相关会员或商品已不存在，无法撤销');
      p.remain += u.qty; if (u.balanceDelta) m.balance -= u.balanceDelta; adjustOwned(m.id, String(p.id), -u.qty);
    } else if (u.kind === 'draw') {
      const m = state.members.find(x => x.id === u.memberId), s = state.sets.find(x => x.id === u.setId);
      if (!m || !s) return toast('相关会员或商品套已不存在，无法撤销');
      u.items.forEach(item => {
        if (item.kind === 'normal') { const p = state.prizes.find(x => x.id === item.prizeId); if (p) { p.remain++; adjustOwned(m.id, String(p.id), -1); } }
        else if (item.kind === 'last') { adjustOwned(m.id, 'last-' + s.id, -1); s.lastAwarded = false; }
      });
      if (u.balanceDelta) m.balance -= u.balanceDelta;
      if (setRemain(s.id) > 0 && s.status === 'done') s.status = 'active';
    }
    l.undone = true; save(); render(); toast('已撤销');
  }

  const oldLogs = renderLogs;
  renderLogs = function() {
    const box = document.querySelector('#historyList');
    box.innerHTML = state.logs.length ? state.logs.map((l,i) => '<div class="row"><div class="main"><div class="name">'+esc(l.text)+'</div><div class="meta">'+esc(l.type)+' · '+esc(l.time)+(l.undone?' · 已撤销':'')+'</div></div>'+(l.undo&&!l.undone?'<button type="button" class="btn danger v2-undo" data-i="'+i+'" style="min-height:34px;padding:6px 9px;font-size:12px">撤销</button>':'')+'</div>').join('') : '<div class="empty">暂无记录</div>';
    box.querySelectorAll('.v2-undo').forEach(b => b.addEventListener('click', () => undoLog(+b.dataset.i)));
  };

  render = function() { oldRender(); enhanceMembers(); enhanceSets(); };

  balance = function(dir) {
    const m = state.members.find(x=>x.id===+document.querySelector('#balMember').value), a = Number(document.querySelector('#balAmount').value);
    if(!m||!Number.isFinite(a)||a<=0) return toast('请选择会员并输入金额');
    if(dir<0&&m.balance<a) return toast('余额不足');
    const delta = dir*a; m.balance += delta;
    txLog('余额',(dir>0?'充值：':'扣款：')+m.name+' '+money(a),{kind:'balance',memberId:m.id,delta});
    document.querySelector('#balAmount').value=''; render(); toast(dir>0?'充值成功':'扣款成功');
  };

  document.querySelector('#saleForm').addEventListener('submit', e => {
    e.preventDefault(); e.stopImmediatePropagation();
    const m=state.members.find(x=>x.id===+document.querySelector('#saleMember').value), s=state.sets.find(x=>x.id===+document.querySelector('#saleSet').value), p=state.prizes.find(x=>x.id===+document.querySelector('#salePrize').value), q=Math.max(1,Math.floor(Number(document.querySelector('#saleQty').value)||1)), amt=Math.max(0,Number(document.querySelector('#saleAmount').value)||0), pay=document.querySelector('#salePay').value;
    if(!m||!s||!p)return toast('请选择会员和奖品'); if(p.remain<q)return toast('库存不足'); if(pay==='会员余额'&&m.balance<amt)return toast('会员余额不足');
    p.remain-=q; let balanceDelta=0; if(pay==='会员余额'){m.balance-=amt;balanceDelta=-amt} addOwned(m,s,p,q);
    txLog('销售',m.name+' 购买 '+p.rank+' '+p.name+' × '+q,{kind:'sale',memberId:m.id,prizeId:p.id,qty:q,balanceDelta}); render(); toast('销售已记录');
  }, true);

  document.querySelector('#drawBtn').addEventListener('click', e => {
    e.preventDefault(); e.stopImmediatePropagation();
    const m=state.members.find(x=>x.id===+document.querySelector('#drawMember').value), s=state.sets.find(x=>x.id===+document.querySelector('#drawSet').value), times=Math.max(1,Math.min(50,Math.floor(Number(document.querySelector('#drawTimes').value)||1))), pay=document.querySelector('#drawPay').value;
    if(!m||!s)return toast('请选择会员和商品套'); const rem=setRemain(s.id); if(rem<times)return toast('这套只剩 '+rem+' 签'); const totalPrice=s.drawPrice*times; if(pay==='会员余额'&&m.balance<totalPrice)return toast('会员余额不足');
    let balanceDelta=0; if(pay==='会员余额'){m.balance-=totalPrice;balanceDelta=-totalPrice} round=[]; const items=[];
    for(let n=0;n<times;n++){const pool=[];state.prizes.filter(p=>p.setId===s.id&&p.remain>0).forEach(p=>{for(let i=0;i<p.remain;i++)pool.push(p)});const p=pool[Math.floor(Math.random()*pool.length)];p.remain--;addOwned(m,s,p,1);items.push({kind:'normal',prizeId:p.id});round.push({rank:p.rank,name:p.name,setName:s.name,member:m.name});if(setRemain(s.id)===0){s.status='done';if(s.hasLast&&!s.lastAwarded){s.lastAwarded=true;addOwned(m,s,null,1,'last');items.push({kind:'last'});round.push({rank:'Last赏',name:s.lastPrize,setName:s.name,member:m.name})}}}
    txLog('抽赏',m.name+' 在「'+s.name+'」完成 '+times+' 抽',{kind:'draw',memberId:m.id,setId:s.id,items,balanceDelta}); document.querySelector('#latestResult').textContent=round.length?round[round.length-1].rank+' '+round[round.length-1].name:'等待抽奖'; render(); toast('抽奖完成');
  }, true);

  render();
})();
