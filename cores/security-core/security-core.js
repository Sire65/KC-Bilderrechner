(()=>{
"use strict";
const VERSION="0.3.0";
const ROLES=Object.freeze(["cashier","shiftlead","manager","admin","superadmin"]);
const DEFAULT_SESSION_MAX_AGE_MS=30*60*1000;
const DEFAULT_STEP_UP_MAX_AGE_MS=5*60*1000;
const MAX_SESSION_MAX_AGE_MS=8*60*60*1000;
const MAX_STEP_UP_MAX_AGE_MS=30*60*1000;
const DEFAULT_GRANTS=Object.freeze({
 cashier:["sale.create","cart.edit","product.info.read"],
 shiftlead:["sale.create","cart.edit","product.info.read","receipt.park","receipt.cancel","discount.apply","cash.withdraw"],
 manager:["sale.create","cart.edit","product.info.read","receipt.park","receipt.cancel","discount.apply","cash.withdraw","reports.read","catalog.edit","inventory.adjust","product.info.approve","closing.execute"],
 admin:["sale.create","cart.edit","product.info.read","receipt.park","receipt.cancel","discount.apply","cash.withdraw","reports.read","catalog.edit","inventory.adjust","product.info.approve","closing.execute","users.manage","settings.manage","audit.read"],
 superadmin:["*"]
});
function normalizeRole(role){return ROLES.includes(role)?role:"cashier"}
function boundedMs(value,fallback,min,max){const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,Math.round(n))):fallback}
function normalizePolicy(policy={}){
 const grants={};
 for(const role of ROLES){grants[role]=Array.from(new Set([...(DEFAULT_GRANTS[role]||[]),...((policy.grants&&policy.grants[role])||[])])).filter(Boolean)}
 return{
  version:VERSION,
  grants,
  stepUp:Array.from(new Set(policy.stepUp||["receipt.cancel","cash.withdraw","inventory.adjust","users.manage","settings.manage","protected.open"])),
  reasonRequired:Array.from(new Set(policy.reasonRequired||["receipt.cancel","cash.withdraw","inventory.adjust"])),
  stepUpMethods:Array.from(new Set(policy.stepUpMethods||["pin","qr"])),
  sessionMaxAgeMs:boundedMs(policy.sessionMaxAgeMs,DEFAULT_SESSION_MAX_AGE_MS,60*1000,MAX_SESSION_MAX_AGE_MS),
  stepUpMaxAgeMs:boundedMs(policy.stepUpMaxAgeMs,DEFAULT_STEP_UP_MAX_AGE_MS,30*1000,MAX_STEP_UP_MAX_AGE_MS)
 }
}
function parseTime(value){const time=Date.parse(String(value||""));return Number.isFinite(time)?time:null}
function sessionTime(session){return parseTime(session?.authenticatedAt||session?.startedAt)}
function stepUpTime(session,policy){
 if(!session||!policy.stepUpMethods.includes(String(session.loginMethod||"")))return null;
 return parseTime(session.stepUpAt||session.authenticatedAt||session.startedAt)
}
function sessionState(session,policy,nowMs=Date.now()){
 if(!session)return{ok:false,code:"NO_SESSION",ageMs:null};
 if(session.valid===false)return{ok:false,code:"INVALID_SESSION",ageMs:null};
 const at=sessionTime(session);
 if(at==null)return{ok:false,code:"SESSION_TIMESTAMP_REQUIRED",ageMs:null};
 const age=Math.max(0,nowMs-at);
 if(age>policy.sessionMaxAgeMs)return{ok:false,code:"SESSION_EXPIRED",ageMs:age};
 return{ok:true,code:"SESSION_OK",ageMs:age};
}
function grantAllowed(permission,role,policy){const list=policy.grants[normalizeRole(role)]||[];return list.includes("*")||list.includes(permission)}
function decision(permission,ctx={}){
 const policy=normalizePolicy(ctx.policy),role=normalizeRole(ctx.role),session=sessionState(ctx.session,policy),requiresStepUp=policy.stepUp.includes(permission),requiresReason=policy.reasonRequired.includes(permission);
 if(!session.ok)return{allowed:false,permission,role,requiresStepUp,requiresReason,stepUpSatisfied:false,sessionAgeMs:session.ageMs,code:session.code};
 if(!grantAllowed(permission,role,policy))return{allowed:false,permission,role,requiresStepUp,requiresReason,stepUpSatisfied:false,sessionAgeMs:session.ageMs,code:"DENY_PERMISSION"};
 if(requiresStepUp){
  const at=stepUpTime(ctx.session,policy),age=at==null?null:Math.max(0,Date.now()-at),satisfied=age!=null&&age<=policy.stepUpMaxAgeMs;
  if(!satisfied)return{allowed:false,permission,role,requiresStepUp:true,requiresReason,stepUpSatisfied:false,stepUpAgeMs:age,sessionAgeMs:session.ageMs,code:"STEP_UP_REQUIRED"};
  return{allowed:true,permission,role,requiresStepUp:true,requiresReason,stepUpSatisfied:true,stepUpAgeMs:age,sessionAgeMs:session.ageMs,code:"ALLOW"};
 }
 return{allowed:true,permission,role,requiresStepUp:false,requiresReason,stepUpSatisfied:true,sessionAgeMs:session.ageMs,code:"ALLOW"};
}
function has(permission,ctx={}){return decision(permission,ctx).allowed}
function guard(permission,ctx={},onDenied){const d=decision(permission,ctx);if(!d.allowed){try{onDenied&&onDenied(d)}catch{}return false}return true}
window.KCSecurityCore=Object.freeze({VERSION,ROLES,DEFAULT_GRANTS,normalizeRole,normalizePolicy,has,decision,guard,capabilities:()=>({roles:[...ROLES],permissions:[...new Set(Object.values(DEFAULT_GRANTS).flat())],denyByDefault:true,directInvocationProtected:true,sessionExpiry:true,stepUpEnforced:true,stepUpMethods:["pin","qr"],defaultSessionMaxAgeMs:DEFAULT_SESSION_MAX_AGE_MS,defaultStepUpMaxAgeMs:DEFAULT_STEP_UP_MAX_AGE_MS})});
})();
