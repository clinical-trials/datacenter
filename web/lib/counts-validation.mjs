const states=new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(' '));
export function validateSnapshot(x){
 if(!x||typeof x!=='object')throw Error('Snapshot required');
 if(typeof x.observed_at!=='string'||!Number.isFinite(Date.parse(x.observed_at))||Date.parse(x.observed_at)>Date.now()+60000||Date.now()-Date.parse(x.observed_at)>86400000)throw Error('Use an observation from the last 24 hours');
 const out={observed_at:new Date(x.observed_at).toISOString(),source:'USDataMap directory',source_url:'https://usdatamap.com/facilities',verification:'Directory-reported; not independently verified'};
 for(const k of ['operating','under_construction','planned']){if(!Number.isInteger(x[k])||x[k]<0||x[k]>100000)throw Error('Invalid '+k);out[k]=x[k];}
 if(!Number.isInteger(x.total)||x.total!==out.operating+out.under_construction+out.planned)throw Error('Phase totals must reconcile');out.total=x.total;
 for(const k of ['planned_by_state','construction_by_state']){if(x[k]!=null){if(typeof x[k]!=='object'||Array.isArray(x[k]))throw Error('Invalid state breakdown');let sum=0;out[k]={};for(const [s,n] of Object.entries(x[k])){if(!states.has(s)||!Number.isInteger(n)||n<0)throw Error('Invalid state count');sum+=n;out[k][s]=n;}if(sum!==out[k==='planned_by_state'?'planned':'under_construction'])throw Error('State breakdown does not reconcile');}}
 if(typeof x.notes!=='string'||x.notes.length>6000)throw Error('Provide bounded evidence notes');out.notes=x.notes;
 return out;
}
