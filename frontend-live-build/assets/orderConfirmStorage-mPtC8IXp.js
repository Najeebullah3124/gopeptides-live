const t=r=>`gp-order-confirm:${r}`;function n(r){try{sessionStorage.setItem(t(r.order.id),JSON.stringify(r))}catch{}}function s(r){try{const e=sessionStorage.getItem(t(r));return e?JSON.parse(e):null}catch{return null}}export{s as r,n as s};
//# sourceMappingURL=orderConfirmStorage-mPtC8IXp.js.map
