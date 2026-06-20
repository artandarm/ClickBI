// ═══ STATE ═══
var rawA=[], rawB=[], workingData=[], filteredData=[];
var colsA=[], colsB=[], allCols=[];
var colTypes={}, uniqueVals={}, mapping={};
var nullInfo={}; // col -> {count, indices}
var selectedCols=[];
var filterData=[], filterCounter=0;
var sortCol='', sortDir='asc';
var charts={}, chartIdx=0;
var joinApplied=false;
var LIMIT_MAX=100000;
var PALETTE=['#4f98a3','#6daa45','#e0854a','#a86fdf','#d19900','#3a7fc1','#c95e9e','#2d9e6b','#e05c5c','#8e8e3e'];

// ═══ THEME ═══
(function(){var d=window.matchMedia('(prefers-color-scheme:dark)').matches;document.documentElement.setAttribute('data-theme',d?'dark':'light');})();
function toggleTheme(){var h=document.documentElement;h.setAttribute('data-theme',h.getAttribute('data-theme')==='dark'?'light':'dark');rechartAll();}

// ═══ NAV ═══
function goto(id){
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active')});
  document.querySelectorAll('.nav-item').forEach(function(n){n.classList.remove('active')});
  document.getElementById('page-'+id).classList.add('active');
  var ni=document.getElementById('nav-'+id);if(ni)ni.classList.add('active');
}