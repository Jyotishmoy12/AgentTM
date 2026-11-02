import { useEffect, useRef, useState } from 'react';
import { get, message, post } from '../api';
import type { ForkPlan, ForkResult } from '../types';

export function ForkDialog({id,token,onClose}:{id:string;token:string;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  const [name,setName]=useState(`checkpoint-${id.slice(0,8)}-${crypto.randomUUID().slice(0,6)}`);
  const [plan,setPlan]=useState<ForkPlan|null>(null);
  const [allow,setAllow]=useState(false);
  const [error,setError]=useState('');
  const [creating,setCreating]=useState(false);
  const [result,setResult]=useState<ForkResult|null>(null);
  useEffect(()=>{const element=dialog.current;element?.showModal();return()=>element?.close()},[]);
  useEffect(()=>{
    const controller=new AbortController();setPlan(null);setError('');setAllow(false);
    const timer=setTimeout(()=>{get<ForkPlan>(`/checkpoints/${id}/fork?name=${encodeURIComponent(name)}`,controller.signal).then(setPlan).catch(e=>{if(!controller.signal.aborted)setError(message(e))})},250);
    return()=>{clearTimeout(timer);controller.abort()};
  },[id,name]);
  async function create(){
    if(!plan || plan.name!==name || creating || plan.partial && !allow)return;
    setCreating(true);setError('');
    try{setResult(await post<ForkResult>(`/checkpoints/${id}/fork`,{name,allow_partial:allow,confirmed:true},token))}catch(e){setError(message(e))}finally{setCreating(false)}
  }
  return <dialog ref={dialog} className="fork-dialog" aria-labelledby="fork-title" onCancel={e=>{if(creating)e.preventDefault();else onClose()}} onClose={()=>{if(!dialog.current?.open)onClose()}}>
    <div className="fork-dialog-header"><span className="eyebrow">ISOLATED GIT WORKTREE</span><h2 id="fork-title">{result?'Checkpoint restored':'Fork checkpoint'}</h2><p>{result?'All captured file hashes were verified.':'Review the destination before creating a separate workspace.'}</p></div>
    {result?<><p className="fork-success">Ready · {result.checkpoint_id.slice(0,8)}</p><label>Worktree path<code className="fork-destination">{result.worktree_path}</code></label><p className="muted">Branch: <code>{result.branch_name}</code></p><p className="fork-description">Open this directory in your editor. The files may be dirty relative to its Git HEAD. No restored code was executed.</p><div className="fork-dialog-actions"><button onClick={onClose}>Done</button></div></>:<form onSubmit={e=>{e.preventDefault();void create()}}>
      <label htmlFor="fork-name">New fork name</label><input id="fork-name" value={name} onChange={e=>setName(e.target.value)} maxLength={64} disabled={creating} autoComplete="off" spellCheck={false}/>
      {plan?<><label>Destination<code className="fork-destination">{plan.worktree_path}</code></label><p className="muted">Branch: <code>{plan.branch_name}</code></p>{plan.warnings.map((warning,i)=><p className="warning-box" key={i}>{warning}</p>)}{plan.partial&&<label className="partial-consent"><input type="checkbox" checked={allow} onChange={e=>setAllow(e.target.checked)} disabled={creating}/>I reviewed the omissions and accept a partial restore.</label>}</>:!error&&<p className="loading-inline">Checking destination…</p>}
      <p className="fork-description">The original working tree, index and HEAD stay unchanged. No scripts, installers or agent commands will run.</p>
      {error&&<div className="error-box" role="alert">{error}</div>}
      <div className="fork-dialog-actions"><button type="button" onClick={onClose} disabled={creating}>Cancel</button><button className="primary-button" type="submit" disabled={!plan||creating||plan.partial&&!allow}>{creating?'Restoring and verifying…':'Create isolated fork'}</button></div>
    </form>}
  </dialog>
}
