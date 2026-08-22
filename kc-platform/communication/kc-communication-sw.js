self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch{data={body:event.data?.text?.()||''}}
  const title=data.title||'KC Communication';
  const options={
    body:data.body||'',
    icon:data.icon||undefined,
    badge:data.badge||undefined,
    data:data.data||{},
    tag:data.data?.notificationId||undefined,
    renotify:false
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target='./';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){if('focus' in client)return client.focus()}
    if(clients.openWindow)return clients.openWindow(target);
  }));
});
