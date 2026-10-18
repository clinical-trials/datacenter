'use strict';
const {parse}=require('acorn');
const STATES='AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC PR'.split(' ');
const PHASES={existing:'operating',construction:'under_construction',planned:'planned'};
// Read literal records only. Never evaluate or execute downloaded source code.
function staticRecords(code,external=new Map()){
 const ast=parse(code,{ecmaVersion:'latest',sourceType:'module'}),bindings=new Map(),factories=new Map();
 for(const statement of ast.body)if(statement.type==='VariableDeclaration')for(const d of statement.declarations)if(d.id.type==='Identifier'){
  if(d.init?.type==='ArrayExpression')bindings.set(d.id.name,d.init);
  if(d.init?.type==='ArrowFunctionExpression'&&d.init.body.type==='ObjectExpression')factories.set(d.id.name,d.init);
 }
 function readRecord(item){
  let object=item,argumentsByName=new Map();
  if(item?.type==='CallExpression'&&item.callee.type==='Identifier'){
   const factory=factories.get(item.callee.name);if(!factory)throw Error('Unknown record factory');object=factory.body;
   for(const [i,param] of factory.params.entries()){
    if(param.type==='Identifier')argumentsByName.set(param.name,item.arguments[i]);
    else if(param.type==='AssignmentPattern'&&param.left.type==='Identifier')argumentsByName.set(param.left.name,item.arguments[i]||param.right);
    else throw Error('Nonliteral record factory');
   }
  }
  if(object?.type!=='ObjectExpression')throw Error('Nonliteral directory record');
  const record={};for(const key of ['id','company','name','stateCode','status']){
   const p=object.properties.find(p=>p.type==='Property'&&p.kind==='init'&&!p.computed&&!p.method&&(p.key.name||p.key.value)===key);
   const value=p?.value.type==='Identifier'?argumentsByName.get(p.value.name):p?.value;
   if(value?.type!=='Literal'||typeof value.value!=='string')throw Error('Missing literal directory field');record[key]=value.value;
  }return record;
 }
 function read(name,seen=new Set()){
  if(external.has(name))return external.get(name);
  if(seen.has(name)||!bindings.has(name))throw Error('Unresolved directory array');
  seen=new Set([...seen,name]);const records=[];
  for(const item of bindings.get(name).elements){
   if(item?.type==='SpreadElement'&&item.argument.type==='Identifier'){records.push(...read(item.argument.name,seen));continue;}
   records.push(readRecord(item));
  }return records;
 }
 const candidates=[];for(const name of bindings.keys())try{const rows=read(name);if(rows.length)candidates.push(rows);}catch{}
 candidates.sort((a,b)=>b.length-a.length);
 if(!candidates.length)throw Error('Directory literal format changed');
 return candidates[0];
}
function aggregate(base,added){
 if(!Array.isArray(base)||!Array.isArray(added)||!base.length||!added.length)throw Error('Both directory layers must load');
 const rows=[...base,...added.map(r=>({id:'scraped-'+r.id,company:r.company,name:r.name,stateCode:r.state_code,status:r.status}))];
 const ids=new Set(),names=new Set(),result={operating:0,under_construction:0,planned:0,total:0,operating_by_state:{},construction_by_state:{},planned_by_state:{}};
 for(const row of rows){
  if(!['id','company','name','stateCode','status'].every(k=>typeof row[k]==='string'&&row[k].trim()))throw Error('Incomplete directory record');
  if(!Object.hasOwn(PHASES,row.status)||!STATES.includes(row.stateCode))throw Error('Unknown phase or geography; review source');
  const key=[row.company,row.stateCode,row.name].map(x=>x.trim().toLowerCase()).join('::');
  if(ids.has(row.id)||names.has(key))continue;ids.add(row.id);names.add(key);
  const phase=PHASES[row.status],byState=phase==='under_construction'?'construction_by_state':phase+'_by_state';
  result[phase]++;result.total++;result[byState][row.stateCode]=(result[byState][row.stateCode]||0)+1;
 }
 return result;
}
function recordCheck(previous,snapshot,checkedAt,error){
 const result={...previous,schema_version:2,update_policy:'Daily automated source checks; page checks the published feed every five minutes.'};
 result.last_check={checked_at:checkedAt,result:error?'failed':'snapshot',notes:error?'Source check failed; the last successful observation is retained.':'Source layers loaded and phase totals reconciled.'};
 if(snapshot){
  const rows=(previous.snapshots||[]).filter(r=>r.observed_at!==snapshot.observed_at);
  result.snapshots=[...rows,snapshot].sort((a,b)=>(a.observed_at||a.date).localeCompare(b.observed_at||b.date));
 }return result;
}
function facilityImports(code){return parse(code,{ecmaVersion:'latest',sourceType:'module'}).body.filter(n=>n.type==='ImportDeclaration'&&/^\.\/data-facilities-[\w-]+\.js$/.test(n.source.value)).map(n=>{if(n.specifiers.length!==1)throw Error('Directory import format changed');return{file:n.source.value,name:n.specifiers[0].local.name};});}
function bundledSupplement(code){
 const candidates=[];for(const statement of parse(code,{ecmaVersion:'latest',sourceType:'module'}).body)if(statement.type==='VariableDeclaration')for(const d of statement.declarations){
  if(d.init?.type!=='ArrayExpression'||!d.init.elements.length)continue;
  try{const rows=d.init.elements.map(item=>{if(item.type!=='ObjectExpression')throw Error();const row={};for(const key of ['id','company','name','state_code','status']){const p=item.properties.find(p=>p.type==='Property'&&!p.computed&&(p.key.name||p.key.value)===key);if(p?.value.type!=='Literal'||typeof p.value.value!=='string')throw Error();row[key]=p.value.value;}return row;});candidates.push(rows);}catch{}
 }candidates.sort((a,b)=>b.length-a.length);if(!candidates.length)throw Error('Bundled supplement format changed');return candidates[0];
}
module.exports={staticRecords,facilityImports,bundledSupplement,aggregate,recordCheck};
