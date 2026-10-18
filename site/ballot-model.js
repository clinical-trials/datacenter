/* Election dates classify records; they never infer results or voting deadlines. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BallotMeasures=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  function phase(record,date=today()){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(record.electionDate||''))return 'unknown';
    return record.electionDate>date?'upcoming':record.electionDate===date?'today':'past';
  }
  function snapshotCount(snapshot,state){return Object.hasOwn(snapshot.byState,state)?snapshot.byState[state]:null;}
  function filter(rows,state='all',period='all',date=today()){
    return rows.filter(r=>(state==='all'||r.state===state)&&(period==='all'||(period==='upcoming'?['upcoming','today'].includes(phase(r,date)):phase(r,date)===period)))
      .sort((a,b)=>{const pa=phase(a,date)==='past',pb=phase(b,date)==='past';return pa!==pb?Number(pa)-Number(pb):pa?b.electionDate.localeCompare(a.electionDate):a.electionDate.localeCompare(b.electionDate);});
  }
  return {phase,snapshotCount,filter,today};
});
