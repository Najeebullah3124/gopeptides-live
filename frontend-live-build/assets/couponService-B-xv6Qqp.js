import{c as t,u as o}from"./index-HwGZ6tVE.js";const a={validate(e,n){return o(t.post("/coupons/validate",{code:e,subtotal:n}))},adminList(){return o(t.get("/coupons"))},adminCreate(e){return o(t.post("/coupons",e))},adminUpdate(e,n){return o(t.put(`/coupons/${e}`,n))},adminDelete(e){return t.delete(`/coupons/${e}`)}};export{a as c};
//# sourceMappingURL=couponService-B-xv6Qqp.js.map
