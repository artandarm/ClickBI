// ═══ TYPE DETECTION ═══
function detectTypes(data,cols){
  cols.forEach(function(c){
    var numCount=0,total=0;
    data.forEach(function(r){
      var v=String(r[c]!=null?r[c]:'').trim();
      if(v!==''&&v.toLowerCase()!=='null'&&v.toLowerCase()!=='na'){total++;if(!isNaN(v)&&v!=='')numCount++;}
    });
    colTypes[c]=(total>0&&numCount/total>0.7)?'num':'cat';
  });
}

function buildUniqueVals(data,cols){
  cols.forEach(function(c){
    var seen={},arr=[];
    data.forEach(function(r){
      var v=String(r[c]!=null?r[c]:'');
      if(!seen[v]&&arr.length<300){seen[v]=1;arr.push(v);}
    });
    if(colTypes[c]==='num')arr.sort(function(a,b){return parseFloat(a)-parseFloat(b);});
    else arr.sort(function(a,b){return a.localeCompare(b);});
    uniqueVals[c]=arr;
  });
}

// ═══ PREVIEW A ═══
function buildPreviewA(){
  var rows=rawA.slice(0,6);
  var h='<thead><tr>'+colsA.map(function(c){return'<th>'+esc(c)+'</th>'}).join('')+'</tr></thead><tbody>';
  rows.forEach(function(row,ri){
    h+='<tr>'+colsA.map(function(c){
      var v=row[c]!=null?row[c]:'';
      var isEmpty=String(v).trim()===''||String(v).toLowerCase()==='null'||String(v).toLowerCase()==='na';
      return'<td'+(isEmpty?' class="cell-null"':'')+'>'+esc(isEmpty?'∅ пусто':v)+'</td>';
    }).join('')+'</tr>';
  });
  h+='</tbody>';
  document.getElementById('previewTblA').innerHTML=h;
  document.getElementById('badgeA').textContent=rawA.length+' строк · '+colsA.length+' кол.';
  document.getElementById('previewMetaA').textContent='Первые 6 строк из '+rawA.length;
  document.getElementById('previewCardA').style.display='block';
  buildNullPanel('nullPanelA',rawA,colsA);
}

// ═══ PREVIEW B ═══
function buildPreviewB(){
  var rows=rawB.slice(0,5);
  var h='<thead><tr>'+colsB.map(function(c){return'<th>'+esc(c)+'</th>'}).join('')+'</tr></thead><tbody>';
  rows.forEach(function(row){h+='<tr>'+colsB.map(function(c){return'<td>'+esc(row[c]!=null?row[c]:'')+'</td>'}).join('')+'</tr>';});
  h+='</tbody>';
  document.getElementById('previewTblB').innerHTML=h;
  document.getElementById('badgeB').textContent=rawB.length+' строк · '+colsB.length+' кол.';
  document.getElementById('previewBSection').style.display='block';
}

// ═══ MAPPING ═══
function buildMapForm(){
  var c=document.getElementById('mapContainer');c.innerHTML='';
  colsA.forEach(function(col){
    var row=document.createElement('div');
    row.className='map-grid';row.style.marginBottom='8px';
    var typeClass=colTypes[col]==='num'?'type-num':'type-cat';
    var typeLabel=colTypes[col]==='num'?'NUM':'CAT';
    row.innerHTML='<div class="map-orig" title="'+esc(col)+'">'+esc(col)+'</div>'
      +'<div style="color:var(--txf);text-align:center;font-size:12px">→</div>'
      +'<input class="map-inp" data-col="'+esc(col)+'" value="'+esc(col)+'" placeholder="Название">'
      +'<span class="type-badge '+typeClass+'">'+typeLabel+'</span>';
    c.appendChild(row);
  });
}

function applyMap(){
  document.querySelectorAll('.map-inp').forEach(function(inp){
    var orig=inp.getAttribute('data-col');
    mapping[orig]=inp.value.trim()||orig;
  });
  allCols=colsA.slice();
  buildColCheckboxes();buildOrderBySelect();buildFilters();updateSQL();runQuery();
  goto('join');
}

function lbl(col){return mapping[col]||col;}

// ═══ JOIN ═══
function buildJoinKeySelects(){
  var kA=document.getElementById('joinKeyA');
  var kB=document.getElementById('joinKeyB');
  kA.innerHTML=colsA.map(function(c){return'<option value="'+esc(c)+'">'+esc(lbl(c))+'</option>'}).join('');
  kB.innerHTML=colsB.map(function(c){return'<option value="'+esc(c)+'">'+esc(c)+'</option>'}).join('');
}

function applyJoin(){
  if(!rawB.length){goto('query');return;}
  var type=document.getElementById('joinType').value;
  var kA=document.getElementById('joinKeyA').value;
  var kB=document.getElementById('joinKeyB').value;

  // Build lookup from B
  var lookupB={};
  rawB.forEach(function(row){
    var k=String(row[kB]!=null?row[kB]:'');
    if(!lookupB[k])lookupB[k]=[];
    lookupB[k].push(row);
  });

  // Extra cols from B (excluding join key)
  var extraCols=colsB.filter(function(c){return c!==kB;});
  var emptyB={};extraCols.forEach(function(c){emptyB[c]='';});

  var result=[];

  if(type==='inner'||type==='left'){
    rawA.forEach(function(rowA){
      var k=String(rowA[kA]!=null?rowA[kA]:'');
      var matches=lookupB[k];
      if(matches&&matches.length){
        matches.forEach(function(rowB){
          var merged=Object.assign({},rowA);
          extraCols.forEach(function(c){merged['B.'+c]=rowB[c]!=null?rowB[c]:'';});
          result.push(merged);
        });
      } else if(type==='left'){
        var merged=Object.assign({},rowA);
        extraCols.forEach(function(c){merged['B.'+c]='';});
        result.push(merged);
      }
    });
  }
  if(type==='right'){
    var usedKeys={};
    rawA.forEach(function(rowA){
      var k=String(rowA[kA]!=null?rowA[kA]:'');
      var matches=lookupB[k];
      if(matches&&matches.length){
        matches.forEach(function(rowB){
          var merged=Object.assign({},rowA);
          extraCols.forEach(function(c){merged['B.'+c]=rowB[c]!=null?rowB[c]:'';});
          usedKeys[String(rowB[kB])]=true;
          result.push(merged);
        });
      }
    });
    rawB.forEach(function(rowB){
      if(!usedKeys[String(rowB[kB])]){
        var merged={};colsA.forEach(function(c){merged[c]='';});
        merged[kA]=rowB[kB];
        extraCols.forEach(function(c){merged['B.'+c]=rowB[c]!=null?rowB[c]:'';});
        result.push(merged);
      }
    });
  }

  workingData=result;
  joinApplied=true;

  // Update allCols
  var newCols=extraCols.map(function(c){return'B.'+c;});
  allCols=colsA.concat(newCols);
  newCols.forEach(function(c){mapping[c]=c;colTypes[c]=colTypes[c.slice(2)]||'cat';});
  detectTypes(result,allCols);
  buildUniqueVals(result,allCols);
  buildColCheckboxes();buildOrderBySelect();buildFilters();

  // Preview
  document.getElementById('joinResultBadge').textContent=result.length+' строк · '+allCols.length+' кол.';
  var previewRows=result.slice(0,5);
  var h='<thead><tr>'+allCols.map(function(c){return'<th>'+esc(lbl(c))+'</th>'}).join('')+'</tr></thead><tbody>';
  previewRows.forEach(function(row){h+='<tr>'+allCols.map(function(c){return'<td>'+esc(row[c]!=null?row[c]:'')+'</td>'}).join('')+'</tr>';});
  h+='</tbody>';
  document.getElementById('joinPreviewTbl').innerHTML=h;
  document.getElementById('joinPreviewSection').style.display='block';
  runQuery();
}