// ═══ UPLOAD A ═══
var dzA=document.getElementById('dropZoneA'), fA=document.getElementById('fileA');
dzA.addEventListener('click',function(){fA.click()});
fA.addEventListener('click',function(e){e.stopPropagation()});
fA.addEventListener('change',function(){if(fA.files&&fA.files[0])parseFileA(fA.files[0]);});
dzA.addEventListener('dragover',function(e){e.preventDefault();dzA.classList.add('drag')});
dzA.addEventListener('dragleave',function(){dzA.classList.remove('drag')});
dzA.addEventListener('drop',function(e){e.preventDefault();dzA.classList.remove('drag');var f=e.dataTransfer.files[0];if(f)parseFileA(f);});

function parseFileA(file){
  document.getElementById('statusA').textContent='Загружаю…';
  Papa.parse(file,{header:true,skipEmptyLines:false,dynamicTyping:false,
    complete:function(res){
      rawA=res.data.filter(function(r){return Object.values(r).some(function(v){return String(v).trim()!=='';})});
      colsA=res.meta.fields||[];
      mapping={};colsA.forEach(function(c){mapping[c]=c;});
      workingData=rawA.slice();
      joinApplied=false;
      detectTypes(rawA,colsA);
      buildUniqueVals(rawA,colsA);
      detectNulls(rawA,colsA);
      document.getElementById('statusA').textContent='';
      buildPreviewA();buildMapForm();
      buildColCheckboxes();buildOrderBySelect();buildFilters();
      updateSQL();renderResult();
    },
    error:function(e){document.getElementById('statusA').textContent='Ошибка: '+e.message;}
  });
}

// ═══ UPLOAD B ═══
var dzB=document.getElementById('dropZoneB'), fB=document.getElementById('fileB');
dzB.addEventListener('click',function(){fB.click()});
fB.addEventListener('click',function(e){e.stopPropagation()});
fB.addEventListener('change',function(){if(fB.files&&fB.files[0])parseFileB(fB.files[0]);});
dzB.addEventListener('dragover',function(e){e.preventDefault();dzB.classList.add('drag')});
dzB.addEventListener('dragleave',function(){dzB.classList.remove('drag')});
dzB.addEventListener('drop',function(e){e.preventDefault();dzB.classList.remove('drag');var f=e.dataTransfer.files[0];if(f)parseFileB(f);});

function parseFileB(file){
  document.getElementById('statusB').textContent='Загружаю…';
  Papa.parse(file,{header:true,skipEmptyLines:true,dynamicTyping:false,
    complete:function(res){
      rawB=res.data;colsB=res.meta.fields||[];
      document.getElementById('statusB').textContent='';
      buildPreviewB();
      document.getElementById('joinConfigCard').style.display='block';
      buildJoinKeySelects();
    }
  });
}

// ═══ NULL DETECTION ═══
function detectNulls(data,cols){
  nullInfo={};
  cols.forEach(function(c){
    var indices=[];
    data.forEach(function(row,i){
      var v=row[c];
      if(v===undefined||v===null||String(v).trim()===''||String(v).toLowerCase()==='null'||String(v).toLowerCase()==='na'||String(v).toLowerCase()==='n/a'){
        indices.push(i);
      }
    });
    if(indices.length>0)nullInfo[c]={count:indices.length,indices:indices};
  });
}

function buildNullPanel(containerId, data, cols){
  var container=document.getElementById(containerId);
  var nullCols=Object.keys(nullInfo);
  if(!nullCols.length){container.innerHTML='';return;}

  var badgeEl=document.getElementById('nullBadgeA');
  if(badgeEl)badgeEl.innerHTML=' <span class="badge badge-warn">'+nullCols.length+' кол. с пропусками</span>';

  var html='<div class="null-panel"><div class="null-panel-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Обнаружены пропущенные значения</div>';
  nullCols.forEach(function(c){
    var isNum=colTypes[c]==='num';
    var info=nullInfo[c];
    html+='<div class="null-col-row">';
    html+='<span class="null-col-name">'+esc(c)+'</span>';
    html+='<span class="null-count">'+info.count+' пропусков</span>';
    if(isNum){
      html+='<select class="fill-select" id="fill-method-'+escId(c)+'">'
        +'<option value="mean">Среднее (mean)</option>'
        +'<option value="median">Медиана (median)</option>'
        +'<option value="mode">Мода (mode)</option>'
        +'<option value="zero">Ноль (0)</option>'
        +'</select>';
      html+='<button class="fill-btn" onclick="fillNulls(\''+esc(c)+'\')">Заполнить</button>';
    } else {
      html+='<span style="font-size:11px;color:var(--warn);font-style:italic">Качественная переменная — заполнение недоступно. Пустые ячейки подсвечены в таблице.</span>';
    }
    html+='</div>';
  });
  html+='</div>';
  container.innerHTML=html;
}

function fillNulls(col){
  var sid='fill-method-'+escId(col);
  var sel=document.getElementById(sid);
  var method=sel?sel.value:'mean';
  var vals=rawA.map(function(r){return parseFloat(r[col]);}).filter(function(v){return!isNaN(v);});
  if(!vals.length)return;
  var fillVal=0;
  if(method==='mean')fillVal=+(vals.reduce(function(a,b){return a+b},0)/vals.length).toFixed(4);
  else if(method==='median'){vals.sort(function(a,b){return a-b});var mid=Math.floor(vals.length/2);fillVal=vals.length%2?vals[mid]:+((vals[mid-1]+vals[mid])/2).toFixed(4);}
  else if(method==='mode'){var freq={};vals.forEach(function(v){freq[v]=(freq[v]||0)+1;});fillVal=+Object.keys(freq).sort(function(a,b){return freq[b]-freq[a]})[0];}
  else if(method==='zero')fillVal=0;

  rawA.forEach(function(row){
    var v=row[col];
    if(v===undefined||v===null||String(v).trim()===''||String(v).toLowerCase()==='null'||String(v).toLowerCase()==='na'){
      row[col]=String(fillVal);
    }
  });
  workingData=rawA.slice();
  detectNulls(rawA,colsA);
  buildUniqueVals(rawA,colsA);
  buildPreviewA();
  buildNullPanel('nullPanelA',rawA,colsA);
  runQuery();
}