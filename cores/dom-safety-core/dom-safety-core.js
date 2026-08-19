(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.KCDomSafety=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const VERSION='0.1.0';
  const FORBIDDEN_TAGS=new Set(['SCRIPT','IFRAME','OBJECT','EMBED','BASE','META','LINK','STYLE','SVG','MATH']);
  const URL_ATTRS=new Set(['href','src','action','formaction','poster','xlink:href']);
  const SAFE_STYLE_PROPS=new Set(['--tile-color','--group-color','--sample-color','background','background-color','color']);
  const SAFE_COLOR=/^(?:#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)|[a-z]{1,24})$/i;
  const DATA_IMAGE=/^data:image\/(?:png|jpeg|jpg|gif|webp);base64,[a-z0-9+/=\s]+$/i;

  function normalizeUrl(value){
    return String(value??'').replace(/[\u0000-\u001F\u007F\s]+/g,'').trim();
  }
  function sanitizeUrl(value){
    const raw=String(value??'').trim();
    const compact=normalizeUrl(raw).toLowerCase();
    if(!raw)return '';
    if(compact.startsWith('javascript:')||compact.startsWith('vbscript:')||compact.startsWith('data:text/html'))return '';
    if(compact.startsWith('data:'))return DATA_IMAGE.test(raw)?raw:'';
    if(compact.startsWith('blob:'))return raw;
    if(/^(?:https?:|mailto:|tel:)/i.test(raw))return raw;
    if(/^(?:\/|\.\/|\.\.\/|#|\?)/.test(raw))return raw;
    if(!/^[a-z][a-z0-9+.-]*:/i.test(raw))return raw;
    return '';
  }
  function sanitizeStyleText(styleText){
    const out=[];
    for(const part of String(styleText||'').split(';')){
      const idx=part.indexOf(':');if(idx<1)continue;
      const prop=part.slice(0,idx).trim().toLowerCase(),value=part.slice(idx+1).trim();
      if(!SAFE_STYLE_PROPS.has(prop)||!SAFE_COLOR.test(value))continue;
      out.push(`${prop}:${value}`);
    }
    return out.join(';');
  }
  function sanitizeElement(node){
    if(!node||node.nodeType!==1)return;
    if(FORBIDDEN_TAGS.has(node.tagName)){node.remove();return;}
    for(const attr of Array.from(node.attributes||[])){
      const name=String(attr.name||'').toLowerCase();
      const value=String(attr.value||'');
      if(name.startsWith('on')||name==='srcdoc'||name==='nonce'||name==='integrity'){
        node.removeAttribute(attr.name);continue;
      }
      if(URL_ATTRS.has(name)){
        const safe=sanitizeUrl(value);if(!safe)node.removeAttribute(attr.name);else if(safe!==value)node.setAttribute(attr.name,safe);continue;
      }
      if(name==='style'){
        const safe=sanitizeStyleText(value);if(!safe)node.removeAttribute(attr.name);else node.setAttribute(attr.name,safe);continue;
      }
    }
    for(const child of Array.from(node.children||[]))sanitizeElement(child);
  }
  function sanitizeHtml(html,doc=root?.document){
    if(!doc?.createElement)return String(html??'');
    const template=doc.createElement('template');
    const proto=root?.Element?.prototype;
    const descriptor=proto&&Object.getOwnPropertyDescriptor(proto,'innerHTML');
    if(!descriptor?.set||!descriptor?.get)return String(html??'');
    descriptor.set.call(template,String(html??''));
    const fragment=template.content||template;
    for(const child of Array.from(fragment.children||[]))sanitizeElement(child);
    return descriptor.get.call(template);
  }
  function install(){
    const proto=root?.Element?.prototype;if(!proto)return false;
    const descriptor=Object.getOwnPropertyDescriptor(proto,'innerHTML');
    if(!descriptor?.set||!descriptor?.get)return false;
    if(proto.__kcDomSafetyInstalled)return true;
    Object.defineProperty(proto,'innerHTML',{
      configurable:descriptor.configurable,
      enumerable:descriptor.enumerable,
      get:descriptor.get,
      set(value){descriptor.set.call(this,sanitizeHtml(value,root.document));}
    });
    Object.defineProperty(proto,'__kcDomSafetyInstalled',{value:true,configurable:false,enumerable:false,writable:false});
    return true;
  }
  const installed=!!root?.document&&install();
  return Object.freeze({VERSION,installed,sanitizeUrl,sanitizeStyleText,sanitizeHtml,install});
});
