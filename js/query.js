// ═══ COL CHECKBOXES (SELECT) ═══
function buildColCheckboxes(){
  selectedCols=allCols.slice();
  var box=document.getElementById('colCheckboxes');box.innerHTML='';
  allCols.forEach(function(col){
    var item=document.createElement('label');
    item.className='col-checkbox-item selected';
    item.innerHTML='<input type="checkbox" checked onchange="toggleCol(\''+esc(col)+'\',this.checked)"> '+esc(lbl(col));
    box.appendChild(item);
  });
}
function toggleCol(col,checked){
  if(checked){if(selectedCols.indexOf(col)===-1)selectedCols.push(col);}
  else{selectedCols=selectedCols.filter(function(c){return c!==col;});}
  var items=document.querySelectorAll('.col-checkbox-item');
  items.forEach(function(item){
    var inp=item.querySelector('input');
    if(inp)item.className='col-checkbox-item'+(inp.checked?' selected':'');
  });
  updateSQL();renderResult();
}
function selectAllCols(state){
  selectedCols=state?allCols.slice():[];
  var items=document.querySelectorAll('.col-checkbox-item');
  items.forEach(function(item){
    var inp=item.querySelector('input');
    if(inp){inp.checked=state;item.className='col-checkbox-item'+(state?' selected':'');}
  });
  updateSQL();renderResult();
}

// ═══ ORDER BY ═══
function buildOrderBySelect(){
  var sel=document.getElementById('orderByCol');
  sel.innerHTML='<option value="">— не сортировать —</option>';
  allCols.forEach(function(c){sel.innerHTML+='<option value="'+esc(c)+'">'+esc(lbl(c))+'</option>';});
  sel.onchange=function(){updateSQL();};
  document.getElementById('orderByDir').onchange=function(){updateSQL();};
}

// ═══ AGG STATS ═══
function buildAggColSelect(){
  var sel=document.getElementById('aggColSel');
  sel.innerHTML='<option value="">— колонка —</option>';
  var sc=selectedCols.length?selectedCols:allCols;
  sc.forEach(function(c){
    if(colTypes[c]==='num')sel.innerHTML+='<option value="'+esc(c)+'">'+esc(lbl(c))+'</option>';
  });
}
function renderAggStats(){
  var col=document.getElementById('aggColSel').value;
  var row=document.getElementById('aggStatsRow');
  if(!col||!filteredData.length){row.style.display='none';return;}
  var vals=filteredData.map(function(r){return parseFloat(r[col]);}).filter(function(v){return!isNaN(v);});
  if(!vals.length){row.style.display='none';return;}
  var sum=vals.reduce(function(a,b){return a+b},0);
  var avg=sum/vals.length;
  var sorted=vals.slice().sort(function(a,b){return a-b;});
  var mid=Math.floor(sorted.length/2);
  var median=sorted.length%2?sorted[mid]:((sorted[mid-1]+sorted[mid])/2);
  var mn=sorted[0],mx=sorted[sorted.length-1];
  var variance=vals.reduce(function(a,v){return a+Math.pow(v-avg,2);},0)/vals.length;
  var std=Math.sqrt(variance);
  row.innerHTML=[
    ['COUNT',vals.length],['SUM',+sum.toFixed(2)],['AVG',+avg.toFixed(2)],
    ['MEDIAN',+median.toFixed(2)],['MIN',mn],['MAX',mx],['STD DEV',+std.toFixed(2)]
  ].map(function(pair){return'<div class="agg-stat"><div class="agg-stat-lbl">'+pair[0]+'</div><div class="agg-stat-val">'+pair[1]+'</div></div>';}).join('');
  row.style.display='flex';
}

// ═══ FILTERS ═══
function buildFilters(){filterData=[];filterCounter=0;document.getElementById('filtersBox').innerHTML='';updateSQL();}
function resetFilters(){buildFilters();document.getElementById('orderByCol').value='';document.getElementById('limitVal').value=50;runQuery();}

function addFilter(){
  filterCounter++;
  var id='f'+filterCounter;
  filterData.push({id:id,col:allCols[0]||'',op:'=',val:'',connector:'AND'});
  renderFilters();updateSQL();
}

function renderFilters(){
  var box=document.getElementById('filtersBox');box.innerHTML='';
  filterData.forEach(function(fd,idx){
    if(idx>0){
      var cdiv=document.createElement('div');
      cdiv.className='filter-connector';
      cdiv.innerHTML='<span style="font-size:11px;color:var(--txf)">Оператор:</span>'
        +'<button class="conn-btn'+(fd.connector==='AND'?' and-active':'')+'" onclick="setConnector(\''+fd.id+'\',\'AND\')">AND</button>'
        +'<button class="conn-btn'+(fd.connector==='OR'?' or-active':'')+'" onclick="setConnector(\''+fd.id+'\',\'OR\')">OR</button>';
      box.appendChild(cdiv);
    }
    var row=document.createElement('div');
    row.className='filter-row';row.id='row-'+fd.id;
    var colOpts=allCols.map(function(c){return'<option value="'+esc(c)+'"'+(c===fd.col?' selected':'')+'>'+esc(lbl(c))+'</option>';}).join('');
    var isNum=fd.col&&colTypes[fd.col]==='num';
    var numOps='<option value="=" '+(fd.op==='='?'sel':'')+'>= равно</option>'
      +'<option value="!=" '+(fd.op==='!='?'sel':'')+'>≠ не равно</option>'
      +'<option value=">" '+(fd.op==='>'?'selected':'')+'>&#62; больше</option>'
      +'<option value="<" '+(fd.op==='<'?'selected':'')+'>&#60; меньше</option>'
      +'<option value=">=" '+(fd.op==='>='?'selected':'')+'>≥ больше/равно</option>'
      +'<option value="<=" '+(fd.op==='<='?'selected':'')+'>≤ меньше/равно</option>'
      +'<option value="between">BETWEEN</option>';
    var catOps='<option value="=" '+(fd.op==='='?'selected':'')+'>= равно</option>'
      +'<option value="!=" '+(fd.op==='!='?'selected':'')+'>≠ не равно</option>'
      +'<option value="in">IN (список)</option>'
      +'<option value="contains" '+(fd.op==='contains'?'selected':'')+'>LIKE содержит</option>'
      +'<option value="not_contains" '+(fd.op==='not_contains'?'selected':'')+'>NOT LIKE</option>';
    var commonOps='<option value="is_null" '+(fd.op==='is_null'?'selected':'')+'>IS NULL</option>'
      +'<option value="not_null" '+(fd.op==='not_null'?'selected':'')+'>IS NOT NULL</option>';
    var opOpts=(isNum?numOps:catOps)+commonOps;
    var needsVal=fd.op!=='is_null'&&fd.op!=='not_null';
    var valHtml='';
    if(!needsVal){
      valHtml='<div class="fld-inp" style="color:var(--txf);background:var(--surfoff);cursor:default;border-style:dashed;display:flex;align-items:center">—</div>';
    } else if(fd.op==='between'){
      valHtml='<input class="fld-inp" id="val-'+fd.id+'" value="'+esc(fd.val)+'" placeholder="мин,макс" oninput="syncVal(\''+fd.id+'\')">';
    } else if(fd.op==='in'){
      // multiselect via datalist / comma input
      valHtml='<input class="fld-inp" id="val-'+fd.id+'" value="'+esc(fd.val)+'" placeholder="val1,val2,val3" oninput="syncVal(\''+fd.id+'\')">';
    } else if(!isNum&&uniqueVals[fd.col]&&uniqueVals[fd.col].length<=150){
      var vOpts=uniqueVals[fd.col].map(function(v){return'<option value="'+esc(v)+'"'+(v===fd.val?' selected':'')+'>'+esc(v)+'</option>';}).join('');
      valHtml='<select class="fld-sel" id="val-'+fd.id+'" onchange="syncVal(\''+fd.id+'\')">'
        +'<option value="">— значение —</option>'+vOpts+'</select>';
    } else {
      var dlId='dl-'+fd.id;
      var dlOpts=uniqueVals[fd.col]?uniqueVals[fd.col].slice(0,100).map(function(v){return'<option value="'+esc(v)+'"/>';}).join(''):'';
      valHtml='<input class="fld-inp" id="val-'+fd.id+'" list="'+dlId+'" value="'+esc(fd.val)+'" placeholder="Значение" oninput="syncVal(\''+fd.id+'\')">'
        +'<datalist id="'+dlId+'">'+dlOpts+'</datalist>';
    }
    row.innerHTML='<select class="fld-sel" id="col-'+fd.id+'" onchange="syncCol(\''+fd.id+'\')"><option value="">— колонка —</option>'+colOpts+'</select>'
      +'<select class="fld-sel" id="op-'+fd.id+'" onchange="syncOp(\''+fd.id+'\')">'+opOpts+'</select>'
      +valHtml
      +'<button class="btn btn-danger btn-sm" onclick="removeFilter(\''+fd.id+'\')">✕</button>';
    box.appendChild(row);
  });
}

function findFd(id){for(var i=0;i<filterData.length;i++){if(filterData[i].id===id)return filterData[i];}return null;}
function syncCol(id){var fd=findFd(id);if(!fd)return;fd.col=document.getElementById('col-'+id).value;fd.op='=';fd.val='';renderFilters();updateSQL();}
function syncOp(id){var fd=findFd(id);if(!fd)return;fd.op=document.getElementById('op-'+id).value;fd.val='';renderFilters();updateSQL();}
function syncVal(id){var fd=findFd(id);if(!fd)return;var el=document.getElementById('val-'+id);fd.val=el?el.value:'';updateSQL();}
function setConnector(id,conn){var fd=findFd(id);if(!fd)return;fd.connector=conn;renderFilters();updateSQL();}
function removeFilter(id){filterData=filterData.filter(function(f){return f.id!==id;});if(filterData.length)filterData[0].connector='AND';renderFilters();updateSQL();}

// ═══ SQL GENERATION ═══
function updateSQL(){
  var src=allCols.length?workingData:[];
  if(!allCols.length){document.getElementById('sqlBox').innerHTML='— нет данных —';return;}
  var sc=selectedCols.length?selectedCols:allCols;
  var colList=sc.map(function(c){return'  "'+c+'" AS "'+esc(lbl(c))+'"';}).join(',\n');
  var fromClause='dataset';
  if(joinApplied){
    var jt=document.getElementById('joinType').value.toUpperCase();
    var kA=document.getElementById('joinKeyA').value;
    var kB=document.getElementById('joinKeyB').value;
    fromClause='A\n  '+jt+' JOIN B ON A."'+kA+'" = B."'+kB+'"';
  }
  var sql='SELECT\n'+colList+'\nFROM '+fromClause;
  var active=filterData.filter(function(f){return f.col&&f.op;});
  if(active.length){
    sql+='\nWHERE\n';
    active.forEach(function(f,i){
      var prefix=i===0?'  ':'  '+f.connector+' ';
      if(f.op==='is_null'){sql+=prefix+'"'+f.col+'" IS NULL\n';return;}
      if(f.op==='not_null'){sql+=prefix+'"'+f.col+'" IS NOT NULL\n';return;}
      if(f.op==='contains'){sql+=prefix+'"'+f.col+'" LIKE \'%'+f.val+'%\'\n';return;}
      if(f.op==='not_contains'){sql+=prefix+'"'+f.col+'" NOT LIKE \'%'+f.val+'%\'\n';return;}
      if(f.op==='between'){var parts=f.val.split(',');sql+=prefix+'"'+f.col+'" BETWEEN '+(parts[0]||'?')+' AND '+(parts[1]||'?')+'\n';return;}
      if(f.op==='in'){sql+=prefix+'"'+f.col+'" IN ('+f.val.split(',').map(function(v){return"'"+v.trim()+"'";}).join(', ')+')\n';return;}
      var isNum=f.val!==''&&!isNaN(f.val)&&colTypes[f.col]==='num';
      sql+=prefix+'"'+f.col+'" '+f.op+' '+(isNum?f.val:"'"+f.val+"'")+'\n';
    });
  }
  var ob=document.getElementById('orderByCol').value;
  var od=document.getElementById('orderByDir').value;
  if(ob)sql+='\nORDER BY "'+ob+'" '+(od==='desc'?'DESC':'ASC');
  var lv=parseInt(document.getElementById('limitVal').value)||50;
  lv=Math.min(lv,LIMIT_MAX);
  sql+='\nLIMIT '+lv+';';
  var html=esc(sql)
    .replace(/\b(SELECT|FROM|WHERE|ORDER BY|LIMIT|JOIN|INNER|LEFT|RIGHT|ON|AND|OR|AS|IS|NOT|NULL|LIKE|BETWEEN|IN)\b/g,'<span class="kw">$1</span>');
  document.getElementById('sqlBox').innerHTML=html;
}

// ═══ RUN QUERY ═══
function runQuery(){
  var active=filterData.filter(function(f){return f.col&&f.op;});
  var base=workingData;

  if(!base.length){filteredData=[];renderResult();return;}

  // Apply WHERE
  filteredData=base.filter(function(row){
    var result=null;
    active.forEach(function(f,i){
      var match=testFilter(row,f);
      if(i===0)result=match;
      else if(f.connector==='OR')result=result||match;
      else result=result&&match;
    });
    return active.length?result:true;
  });

  // ORDER BY
  var ob=document.getElementById('orderByCol').value;
  var od=document.getElementById('orderByDir').value;
  if(ob){
    filteredData.sort(function(a,b){
      var va=a[ob]!=null?a[ob]:'', vb=b[ob]!=null?b[ob]:'';
      var na=parseFloat(va), nb=parseFloat(vb);
      var cmp=(!isNaN(na)&&!isNaN(nb))?(na-nb):String(va).localeCompare(String(vb));
      return od==='desc'?-cmp:cmp;
    });
  }

  // LIMIT
  var lv=parseInt(document.getElementById('limitVal').value)||50;
  lv=Math.min(lv,LIMIT_MAX);
  filteredData=filteredData.slice(0,lv);

  renderResult();
  buildAggColSelect();
  updateSQL();
}

function testFilter(row,f){
  var v=String(row[f.col]!=null?row[f.col]:'');
  switch(f.op){
    case '=': return v===f.val;
    case '!=': return v!==f.val;
    case '>': return parseFloat(v)>parseFloat(f.val);
    case '<': return parseFloat(v)<parseFloat(f.val);
    case '>=': return parseFloat(v)>=parseFloat(f.val);
    case '<=': return parseFloat(v)<=parseFloat(f.val);
    case 'between':{var p=f.val.split(',');return parseFloat(v)>=parseFloat(p[0])&&parseFloat(v)<=parseFloat((p[1]||p[0]));};
    case 'in':{var vals=f.val.split(',').map(function(x){return x.trim();});return vals.indexOf(v)!==-1;};
    case 'contains': return v.toLowerCase().includes(f.val.toLowerCase());
    case 'not_contains': return !v.toLowerCase().includes(f.val.toLowerCase());
    case 'is_null': return v===''||v.toLowerCase()==='null'||v.toLowerCase()==='na';
    case 'not_null': return v!==''&&v.toLowerCase()!=='null'&&v.toLowerCase()!=='na';
    default: return true;
  }
}

function renderResult(){
  var sc=selectedCols.length?selectedCols:allCols;
  var tbl=document.getElementById('resultTbl');
  var nullCols=Object.keys(nullInfo);
  if(!filteredData.length||!sc.length){
    tbl.innerHTML='<tbody><tr><td colspan="99" style="text-align:center;padding:32px;color:var(--txm)">Нет строк по данным условиям</td></tr></tbody>';
    document.getElementById('resultBadge').textContent='0';
    document.getElementById('resultMeta').textContent='';
    document.getElementById('aggStatsRow').style.display='none';
    return;
  }
  // Sortable headers
  var ob=document.getElementById('orderByCol').value;
  var od=document.getElementById('orderByDir').value;
  var h='<thead><tr>'+sc.map(function(c){
    var arrow=c===ob?(od==='asc'?'↑':'↓'):'↕';
    var cls=c===ob?'sort-'+od:'';
    return'<th class="'+cls+'" onclick="clickSort(\''+esc(c)+'\')">'+esc(lbl(c))+'<span class="sort-icon">'+arrow+'</span></th>';
  }).join('')+'</tr></thead><tbody>';
  filteredData.forEach(function(row){
    h+='<tr>'+sc.map(function(c){
      var v=row[c]!=null?row[c]:'';
      var isNull=String(v).trim()===''||String(v).toLowerCase()==='null'||String(v).toLowerCase()==='na';
      var isNullCol=nullCols.indexOf(c)!==-1;
      return'<td'+(isNull&&isNullCol?' class="cell-null"':'')+'>'+esc(isNull&&isNullCol?'∅':v)+'</td>';
    }).join('')+'</tr>';
  });
  h+='</tbody>';
  tbl.innerHTML=h;
  document.getElementById('resultBadge').textContent=filteredData.length;
  var totalBefore=workingData.filter(function(row){
    var active=filterData.filter(function(f){return f.col&&f.op;});
    if(!active.length)return true;
    var res=null;active.forEach(function(f,i){var m=testFilter(row,f);if(i===0)res=m;else if(f.connector==='OR')res=res||m;else res=res&&m;});
    return res;
  }).length;
  var lv=Math.min(parseInt(document.getElementById('limitVal').value)||50,LIMIT_MAX);
  document.getElementById('resultMeta').textContent='Показано '+filteredData.length+' строк (LIMIT '+lv+') · всего подходит: '+totalBefore;
}

function clickSort(col){
  var sel=document.getElementById('orderByCol');
  var dir=document.getElementById('orderByDir');
  if(sel.value===col){dir.value=dir.value==='asc'?'desc':'asc';}
  else{sel.value=col;dir.value='asc';}
  runQuery();
}

function copySql(){var t=document.getElementById('sqlBox').innerText;if(navigator.clipboard)navigator.clipboard.writeText(t);}
function exportCSV(){
  if(!filteredData.length)return;
  var sc=selectedCols.length?selectedCols:allCols;
  var hdr=sc.map(function(c){return'"'+lbl(c)+'"';}).join(',');
  var rows=filteredData.map(function(row){return sc.map(function(c){return'"'+String(row[c]!=null?row[c]:'').replace(/"/g,'""')+'"';}).join(',');});
  var blob=new Blob([[hdr].concat(rows).join('\r\n')],{type:'text/csv;charset=utf-8;'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='clickbi_export.csv';a.click();
}