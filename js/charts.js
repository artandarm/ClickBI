// ═══ CHARTS ═══
function addChart(){
  if(!rawA.length){alert('Сначала загрузите файл');goto('upload');return;}
  chartIdx++;var id='ch'+chartIdx;
  var cg=document.getElementById('chartsGrid');
  document.getElementById('chartsEmpty').style.display='none';cg.style.display='grid';
  var defaultX=allCols[0]||'';var defaultY=allCols[0]||'';
  allCols.forEach(function(c){if(colTypes[c]==='cat')defaultX=defaultX===allCols[0]?c:defaultX;});
  allCols.forEach(function(c){if(colTypes[c]==='num')defaultY=c;});
  var colOpts=allCols.map(function(c){return'<option value="'+esc(c)+'">'+esc(lbl(c))+'</option>';}).join('');
  var card=document.createElement('div');card.className='chart-card';card.id='cc'+id;
  card.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
    +'<span style="font-size:13px;font-weight:600">График '+chartIdx+'</span>'
    +'<div style="display:flex;gap:6px">'
    +'<button class="btn btn-ghost btn-sm" title="Скачать PNG" onclick="downloadChart(\''+id+'\')">⬇ PNG</button>'
    +'<button class="btn btn-ghost btn-sm" onclick="delChart(\''+id+'\')">✕</button></div></div>'
    +'<div class="chart-cfg">'
    +'<div><label class="cfg-lbl">Тип</label><select class="fld-sel" id="t'+id+'" onchange="onAxisChange(\''+id+'\')">'
    +'<option value="bar">Столбцы</option><option value="line">Линия</option><option value="pie">Круг</option><option value="doughnut">Пончик</option><option value="scatter">Точки XY</option>'
    +'</select></div>'
    +'<div><label class="cfg-lbl">Ось X</label><select class="fld-sel" id="x'+id+'" onchange="onAxisChange(\''+id+'\')">'+colOpts+'</select></div>'
    +'<div><label class="cfg-lbl" id="ylbl'+id+'">Ось Y</label><select class="fld-sel" id="y'+id+'" onchange="drawChart(\''+id+'\')">'+colOpts+'</select></div>'
    +'<div><label class="cfg-lbl">&nbsp;</label><button class="btn btn-primary btn-sm" onclick="drawChart(\''+id+'\')">▶</button></div>'
    +'</div>'
    +'<div class="agg-row" id="aggrow'+id+'">'
    +'<span>Агрегация:</span>'
    +'<select id="agg'+id+'" onchange="drawChart(\''+id+'\')">'
    +'<option value="count">Количество (COUNT)</option>'
    +'<option value="avg" selected>Среднее (AVG)</option>'
    +'<option value="sum">Сумма (SUM)</option>'
    +'<option value="max">Максимум (MAX)</option>'
    +'<option value="min">Минимум (MIN)</option>'
    +'</select></div>'
    +'<div style="position:relative;flex:1;min-height:260px"><canvas id="cv'+id+'"></canvas></div>';
  cg.appendChild(card);
  document.getElementById('x'+id).value=defaultX;
  document.getElementById('y'+id).value=defaultY;
  onAxisChange(id);
}

function onAxisChange(id){
  var t=document.getElementById('t'+id).value;
  var aggrow=document.getElementById('aggrow'+id);
  var ylbl=document.getElementById('ylbl'+id);
  var ycol=document.getElementById('y'+id).value;
  var yIsNum=ycol&&colTypes[ycol]==='num';
  if(t==='scatter'){
    aggrow.style.display='none';
    if(ylbl)ylbl.textContent='Ось Y (числовая)';
  } else {
    aggrow.style.display='flex';
    // if Y is categorical, force count and disable other options
    var aggSel=document.getElementById('agg'+id);
    if(aggSel){
      if(!yIsNum){
        aggSel.value='count';
        Array.from(aggSel.options).forEach(function(o){o.disabled=(o.value!=='count');});
      } else {
        Array.from(aggSel.options).forEach(function(o){o.disabled=false;});
      }
    }
    if(ylbl)ylbl.textContent='Ось Y / Значение';
  }
  drawChart(id);
}

function drawChart(id){
  if(charts[id]){charts[id].destroy();delete charts[id];}
  var type=document.getElementById('t'+id).value;
  var xcol=document.getElementById('x'+id).value;
  var ycol=document.getElementById('y'+id).value;
  var aggSel=document.getElementById('agg'+id);
  var agg=aggSel?aggSel.value:'count';
  var data=filteredData.length?filteredData:workingData;
  if(!data.length)return;
  var dark=document.documentElement.getAttribute('data-theme')==='dark';
  var gc=dark?'rgba(255,255,255,.07)':'rgba(0,0,0,.07)';
  var tc=dark?'#797876':'#7a7974';
  Chart.defaults.color=tc;
  var canvas=document.getElementById('cv'+id);if(!canvas)return;

  var tooltipOpts={backgroundColor:dark?'#1c1b19':'#fff',titleColor:dark?'#cdccca':'#28251d',bodyColor:tc,borderColor:dark?'#393836':'#d4d1ca',borderWidth:1};

  // SCATTER
  if(type==='scatter'){
    var pts=[];
    data.forEach(function(r){var x=parseFloat(r[xcol]),y=parseFloat(r[ycol]);if(!isNaN(x)&&!isNaN(y))pts.push({x:x,y:y});});
    if(!pts.length){showChartMsg(id,'Нет числовых данных для scatter');return;}
    charts[id]=new Chart(canvas,{type:'scatter',
      data:{datasets:[{label:lbl(xcol)+' vs '+lbl(ycol),data:pts.slice(0,2000),
        backgroundColor:PALETTE[0]+'bb',pointRadius:4,pointHoverRadius:6}]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{...tooltipOpts}},
        scales:{x:{title:{display:true,text:lbl(xcol),color:tc},grid:{color:gc},ticks:{color:tc}},
                y:{title:{display:true,text:lbl(ycol),color:tc},grid:{color:gc},ticks:{color:tc}}}}});
    return;
  }

  // GROUP + AGG
  var xIsCat=colTypes[xcol]==='cat';
  var yIsCat=colTypes[ycol]==='cat';
  // Force count if Y is categorical or agg='count'
  var useCount=(agg==='count'||yIsCat);

  var grp={};var order=[];
  data.forEach(function(r){
    var k=String(r[xcol]!==undefined&&r[xcol]!==null&&String(r[xcol]).trim()!==''?r[xcol]:'(пусто)');
    if(!grp[k]){grp[k]={vals:[],count:0};order.push(k);}
    grp[k].count++;
    if(!useCount){var yv=parseFloat(r[ycol]);if(!isNaN(yv))grp[k].vals.push(yv);}
  });

  // Sort keys
  var keys;
  if(xIsCat){keys=order.slice().sort(function(a,b){return a.localeCompare(b);});}
  else{keys=order.slice().sort(function(a,b){return parseFloat(a)-parseFloat(b);});}
  keys=keys.slice(0,50);
  if(!keys.length){showChartMsg(id,'Нет данных');return;}

  var vals=keys.map(function(k){
    if(useCount)return grp[k].count;
    var vs=grp[k].vals;
    if(!vs.length)return null;
    switch(agg){
      case 'avg':return+(vs.reduce(function(a,b){return a+b},0)/vs.length).toFixed(3);
      case 'sum':return+vs.reduce(function(a,b){return a+b},0).toFixed(3);
      case 'max':return Math.max.apply(null,vs);
      case 'min':return Math.min.apply(null,vs);
      default:return grp[k].count;
    }
  });

  // Remove null vals entries
  var cleanKeys=[],cleanVals=[];
  keys.forEach(function(k,i){if(vals[i]!==null){cleanKeys.push(k);cleanVals.push(vals[i]);}});
  if(!cleanVals.length){showChartMsg(id,'Нет числовых данных для выбранной оси Y');return;}

  var isPie=type==='pie'||type==='doughnut';
  var labels=cleanKeys.map(function(k){var s=String(k);return s.length>22?s.slice(0,20)+'…':s;});
  var aggLabel=useCount?'Количество':{avg:'Среднее',sum:'Сумма',max:'Максимум',min:'Минимум'}[agg]||'';
  var dsLabel=aggLabel+(useCount?'':' '+lbl(ycol));

  charts[id]=new Chart(canvas,{type:type,
    data:{labels:labels,datasets:[{
      label:dsLabel,data:cleanVals,
      backgroundColor:isPie?cleanKeys.map(function(_,i){return PALETTE[i%PALETTE.length]+'cc';}):PALETTE[0]+'cc',
      borderColor:isPie?cleanKeys.map(function(_,i){return PALETTE[i%PALETTE.length];}):PALETTE[0],
      borderWidth:isPie?2:1,
      borderRadius:type==='bar'?5:0,
      tension:type==='line'?0.3:undefined,
      fill:type==='line'?false:undefined,
      pointRadius:type==='line'?4:undefined,
      pointHoverRadius:type==='line'?6:undefined
    }]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{display:isPie,position:'bottom',labels:{color:tc,boxWidth:12,padding:12,font:{size:11}}},
        tooltip:{...tooltipOpts,callbacks:{label:function(ctx){return' '+ctx.parsed.y+' ('+dsLabel+')';}}}
      },
      scales:isPie?{}:{
        x:{grid:{color:gc},ticks:{color:tc,maxRotation:40,minRotation:0,font:{size:11}},
           title:{display:true,text:lbl(xcol),color:tc,font:{size:11}}},
        y:{grid:{color:gc},ticks:{color:tc,font:{size:11}},beginAtZero:true,
           title:{display:true,text:dsLabel,color:tc,font:{size:11}}}
      }
    }
  });
}

function showChartMsg(id,msg){
  var canvas=document.getElementById('cv'+id);if(!canvas)return;
  var parent=canvas.parentElement;
  var el=document.createElement('div');
  el.style.cssText='display:flex;align-items:center;justify-content:center;height:100%;color:var(--txm);font-size:13px;';
  el.textContent=msg;
  parent.innerHTML='';parent.appendChild(el);
}

function downloadChart(id){
  var canvas=document.getElementById('cv'+id);if(!canvas)return;
  var a=document.createElement('a');
  a.href=canvas.toDataURL('image/png');
  a.download='clickbi_chart_'+id+'.png';
  a.click();
}

function delChart(id){if(charts[id]){charts[id].destroy();delete charts[id];}var c=document.getElementById('cc'+id);if(c)c.remove();if(!document.querySelectorAll('.chart-card').length){document.getElementById('chartsEmpty').style.display='flex';document.getElementById('chartsGrid').style.display='none';}}
function rechartAll(){Object.keys(charts).forEach(function(id){var t=document.getElementById('t'+id);if(t)drawChart(id);});}
new MutationObserver(rechartAll).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

function esc(s){return String(s!=null?s:'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function escId(s){return String(s).replace(/[^a-zA-Z0-9]/g,'_');}

function closeOnboarding(){
  var ov=document.getElementById('obOverlay');
  ov.style.transition='opacity .2s ease';
  ov.style.opacity='0';
  setTimeout(function(){ov.style.display='none';},200);
}
// Close on overlay click (outside modal)
document.getElementById('obOverlay').addEventListener('click',function(e){
  if(e.target===this)closeOnboarding();
});
// Close on Escape
document.addEventListener('keydown',function(e){
  if(e.key==='Escape')closeOnboarding();
});